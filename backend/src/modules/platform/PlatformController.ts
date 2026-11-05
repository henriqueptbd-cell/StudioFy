import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { Request, Response } from 'express';
import { z } from 'zod';
import { DbTransaction, db, withTenant } from '../../db/client.js';
import {
  appointments,
  customers,
  platformAdmins,
  platformAuditLogs,
  services,
  tenants,
  users,
} from '../../db/schema.js';
import { AppError } from '../../shared/errors/AppError.js';
import { PlatformAuthProvider } from './PlatformAuthProvider.js';

const MIN_REPORTABLE_COUNT = 5;

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

const tenantListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

const reasonSchema = z.string().trim().min(3).max(500);
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(10).max(20).optional(),
    logoUrl: z.string().url().max(2048).nullable().optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    reason: reasonSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.name === undefined &&
      value.phone === undefined &&
      value.logoUrl === undefined &&
      value.primaryColor === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um campo para alterar.',
      });
    }
  });

const statusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'PAUSED']),
    reason: reasonSchema,
  })
  .strict();

const restoreSchema = z
  .object({
    status: z.enum(['ACTIVE', 'PAUSED']),
    reason: reasonSchema,
  })
  .strict();

const auditQuerySchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type RawTenantMetrics = {
  customerCount: number;
  activeServiceCount: number;
  activeProfessionalCount: number;
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    cancelled: number;
    completed: number;
  };
};

type PlatformAuditAction =
  | 'PLATFORM_LOGIN_SUCCEEDED'
  | 'PLATFORM_LOGIN_FAILED'
  | 'PLATFORM_IDENTITY_VIEWED'
  | 'PLATFORM_TENANT_LIST_VIEWED'
  | 'PLATFORM_OVERVIEW_VIEWED'
  | 'TENANT_PROFILE_UPDATED'
  | 'TENANT_STATUS_CHANGED'
  | 'TENANT_ARCHIVED'
  | 'TENANT_RESTORED'
  | 'TENANT_AUDIT_VIEWED';

function reportable(value: number): number | null {
  return value === 0 || value >= MIN_REPORTABLE_COUNT ? value : null;
}

function presentMetrics(metrics: RawTenantMetrics) {
  return {
    customerCount: reportable(metrics.customerCount),
    activeServiceCount: reportable(metrics.activeServiceCount),
    activeProfessionalCount: reportable(metrics.activeProfessionalCount),
    appointments: {
      total: reportable(metrics.appointments.total),
      pending: reportable(metrics.appointments.pending),
      confirmed: reportable(metrics.appointments.confirmed),
      rejected: reportable(metrics.appointments.rejected),
      cancelled: reportable(metrics.appointments.cancelled),
      completed: reportable(metrics.appointments.completed),
    },
  };
}

async function rawTenantMetrics(tenantId: string): Promise<RawTenantMetrics> {
  return withTenant(tenantId, async (tx) => {
    const [customersRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));
    const [servicesRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.active, true)));
    const [professionalsRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(eq(users.tenantId, tenantId), eq(users.role, 'PROFESSIONAL'), eq(users.active, true)),
      );
    const [appointmentsRow] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${appointments.status} = 'PENDENTE')::int`,
        confirmed: sql<number>`count(*) filter (where ${appointments.status} = 'CONFIRMADO')::int`,
        rejected: sql<number>`count(*) filter (where ${appointments.status} = 'RECUSADO')::int`,
        cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'CANCELADO')::int`,
        completed: sql<number>`count(*) filter (where ${appointments.status} = 'CONCLUIDO')::int`,
      })
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId));

    return {
      customerCount: customersRow?.count ?? 0,
      activeServiceCount: servicesRow?.count ?? 0,
      activeProfessionalCount: professionalsRow?.count ?? 0,
      appointments: {
        total: appointmentsRow?.total ?? 0,
        pending: appointmentsRow?.pending ?? 0,
        confirmed: appointmentsRow?.confirmed ?? 0,
        rejected: appointmentsRow?.rejected ?? 0,
        cancelled: appointmentsRow?.cancelled ?? 0,
        completed: appointmentsRow?.completed ?? 0,
      },
    };
  });
}

function requestAdminId(request: Request): string {
  if (!request.platformAdmin?.id) {
    throw new AppError('Autenticação da plataforma necessária.', 401, 'UNAUTHORIZED');
  }
  return request.platformAdmin.id;
}

async function writeAudit(
  executor: DbTransaction,
  platformAdminId: string,
  action: PlatformAuditAction,
  reason: string,
  tenantId: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await executor.insert(platformAuditLogs).values({
    platformAdminId,
    tenantId,
    action,
    reason,
    metadata,
  });
}

async function writeStandaloneAudit(
  platformAdminId: string,
  action: PlatformAuditAction,
  reason: string,
  tenantId: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db
    .insert(platformAuditLogs)
    .values({ platformAdminId, tenantId, action, reason, metadata });
}

function tenantIdFrom(request: Request): string {
  return z.string().uuid().parse(request.params.tenantId);
}

export class PlatformController {
  async login(request: Request, response: Response): Promise<Response> {
    const { email, password } = loginSchema.parse(request.body);
    const normalizedEmail = email.trim().toLowerCase();
    const [admin] = await db
      .select()
      .from(platformAdmins)
      .where(sql`lower(${platformAdmins.email}) = ${normalizedEmail}`)
      .limit(1);

    if (!admin || !admin.active) {
      if (admin) {
        await writeStandaloneAudit(
          admin.id,
          'PLATFORM_LOGIN_FAILED',
          'Tentativa de autenticação recusada.',
        );
      }
      throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    }

    const passwordMatches = await PlatformAuthProvider.comparePassword(
      password,
      admin.passwordHash,
    );
    if (!passwordMatches) {
      await writeStandaloneAudit(
        admin.id,
        'PLATFORM_LOGIN_FAILED',
        'Tentativa de autenticação recusada.',
      );
      throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    }

    const token = PlatformAuthProvider.generateToken(admin.id);
    await writeStandaloneAudit(
      admin.id,
      'PLATFORM_LOGIN_SUCCEEDED',
      'Autenticação da plataforma concluída.',
    );
    return response.json({
      success: true,
      data: {
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email },
      },
    });
  }

  async me(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const admin = request.platformAdmin;
    await writeStandaloneAudit(
      adminId,
      'PLATFORM_IDENTITY_VIEWED',
      'Identidade autenticada consultada.',
    );
    return response.json({ success: true, data: { admin } });
  }

  async listTenants(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const query = tenantListSchema.parse(request.query);
    const conditions = [];
    if (query.status) conditions.push(eq(tenants.status, query.status));
    else conditions.push(sql`${tenants.status} <> 'ARCHIVED'`);
    const searchTerm = query.q ?? query.search;
    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      conditions.push(or(ilike(tenants.name, pattern), ilike(tenants.slug, pattern))!);
    }
    const whereClause = and(...conditions);
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenants)
      .where(whereClause);
    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        phone: tenants.phone,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        status: tenants.status,
        createdAt: tenants.createdAt,
        pausedAt: tenants.pausedAt,
        archivedAt: tenants.archivedAt,
      })
      .from(tenants)
      .where(whereClause)
      .orderBy(desc(tenants.createdAt), asc(tenants.name))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const items = await Promise.all(
      rows.map(async (tenant) => ({
        ...tenant,
        metrics: presentMetrics(await rawTenantMetrics(tenant.id)),
      })),
    );

    await writeStandaloneAudit(
      adminId,
      'PLATFORM_TENANT_LIST_VIEWED',
      'Lista de estabelecimentos consultada.',
      null,
      {
        page: query.page,
        pageSize: query.pageSize,
        status: query.status ?? 'OPERATIONAL',
      },
    );
    const total = totalRow?.count ?? 0;
    return response.json({
      success: true,
      data: {
        items,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      },
    });
  }

  async overview(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const tenantRows = await db.select({ id: tenants.id, status: tenants.status }).from(tenants);
    const tenantMetrics = await Promise.all(
      tenantRows.map((tenant) => rawTenantMetrics(tenant.id)),
    );
    const aggregate = tenantMetrics.reduce<RawTenantMetrics>(
      (sum, metrics) => ({
        customerCount: sum.customerCount + metrics.customerCount,
        activeServiceCount: sum.activeServiceCount + metrics.activeServiceCount,
        activeProfessionalCount: sum.activeProfessionalCount + metrics.activeProfessionalCount,
        appointments: {
          total: sum.appointments.total + metrics.appointments.total,
          pending: sum.appointments.pending + metrics.appointments.pending,
          confirmed: sum.appointments.confirmed + metrics.appointments.confirmed,
          rejected: sum.appointments.rejected + metrics.appointments.rejected,
          cancelled: sum.appointments.cancelled + metrics.appointments.cancelled,
          completed: sum.appointments.completed + metrics.appointments.completed,
        },
      }),
      {
        customerCount: 0,
        activeServiceCount: 0,
        activeProfessionalCount: 0,
        appointments: {
          total: 0,
          pending: 0,
          confirmed: 0,
          rejected: 0,
          cancelled: 0,
          completed: 0,
        },
      },
    );
    const statusCounts = {
      active: tenantRows.filter((tenant) => tenant.status === 'ACTIVE').length,
      paused: tenantRows.filter((tenant) => tenant.status === 'PAUSED').length,
      archived: tenantRows.filter((tenant) => tenant.status === 'ARCHIVED').length,
      total: tenantRows.length,
    };
    await writeStandaloneAudit(
      adminId,
      'PLATFORM_OVERVIEW_VIEWED',
      'Indicadores agregados da plataforma consultados.',
    );
    return response.json({
      success: true,
      data: {
        tenants: statusCounts,
        metrics: presentMetrics(aggregate),
      },
    });
  }

  async updateTenantProfile(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const tenantId = tenantIdFrom(request);
    const input = updateProfileSchema.parse(request.body);
    const { reason, ...changes } = input;
    const updatedTenant = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('update');
      if (!tenant) throw new AppError('Estabelecimento não encontrado.', 404, 'TENANT_NOT_FOUND');
      const [updated] = await tx
        .update(tenants)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          phone: tenants.phone,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          status: tenants.status,
          createdAt: tenants.createdAt,
          pausedAt: tenants.pausedAt,
          archivedAt: tenants.archivedAt,
        });
      await writeAudit(tx, adminId, 'TENANT_PROFILE_UPDATED', reason, tenantId, {
        changedFields: Object.keys(changes),
      });
      return updated;
    });
    if (!updatedTenant)
      throw new AppError(
        'Não foi possível atualizar o estabelecimento.',
        500,
        'TENANT_UPDATE_FAILED',
      );
    return response.json({
      success: true,
      data: { ...updatedTenant, metrics: presentMetrics(await rawTenantMetrics(tenantId)) },
    });
  }

  async updateTenantStatus(request: Request, response: Response): Promise<Response> {
    const input = statusSchema.parse(request.body);
    return this.setTenantStatus(request, response, input.status, input.reason);
  }

  async pauseTenant(request: Request, response: Response): Promise<Response> {
    const { reason } = z.object({ reason: reasonSchema }).strict().parse(request.body);
    return this.setTenantStatus(request, response, 'PAUSED', reason);
  }

  async reactivateTenant(request: Request, response: Response): Promise<Response> {
    const { reason } = z.object({ reason: reasonSchema }).strict().parse(request.body);
    return this.setTenantStatus(request, response, 'ACTIVE', reason);
  }

  private async setTenantStatus(
    request: Request,
    response: Response,
    status: 'ACTIVE' | 'PAUSED',
    reason: string,
  ): Promise<Response> {
    const adminId = requestAdminId(request);
    const tenantId = tenantIdFrom(request);
    const updatedTenant = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('update');
      if (!tenant) throw new AppError('Estabelecimento não encontrado.', 404, 'TENANT_NOT_FOUND');
      if (tenant.status === 'ARCHIVED') {
        throw new AppError('Restaure a conta antes de alterar seu status.', 409, 'TENANT_ARCHIVED');
      }
      const now = new Date();
      const [updated] = await tx
        .update(tenants)
        .set({
          status,
          pausedAt:
            status === 'PAUSED' ? (tenant.status === 'PAUSED' ? tenant.pausedAt : now) : null,
          archivedAt: null,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          phone: tenants.phone,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          status: tenants.status,
          createdAt: tenants.createdAt,
          pausedAt: tenants.pausedAt,
          archivedAt: tenants.archivedAt,
        });
      await writeAudit(tx, adminId, 'TENANT_STATUS_CHANGED', reason, tenantId, {
        from: tenant.status,
        to: status,
      });
      return updated;
    });
    if (!updatedTenant)
      throw new AppError('Não foi possível atualizar o status.', 500, 'TENANT_UPDATE_FAILED');
    return response.json({
      success: true,
      data: { ...updatedTenant, metrics: presentMetrics(await rawTenantMetrics(tenantId)) },
    });
  }

  async archiveTenant(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const tenantId = tenantIdFrom(request);
    const { reason } = z.object({ reason: reasonSchema }).strict().parse(request.body);
    const updatedTenant = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('update');
      if (!tenant) throw new AppError('Estabelecimento não encontrado.', 404, 'TENANT_NOT_FOUND');
      if (tenant.status === 'ARCHIVED') {
        throw new AppError('O estabelecimento já está arquivado.', 409, 'TENANT_ALREADY_ARCHIVED');
      }
      const now = new Date();
      const [updated] = await tx
        .update(tenants)
        .set({ status: 'ARCHIVED', archivedAt: now, updatedAt: now })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          phone: tenants.phone,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          status: tenants.status,
          createdAt: tenants.createdAt,
          pausedAt: tenants.pausedAt,
          archivedAt: tenants.archivedAt,
        });
      await writeAudit(tx, adminId, 'TENANT_ARCHIVED', reason, tenantId, {
        from: tenant.status,
        to: 'ARCHIVED',
      });
      return updated;
    });
    if (!updatedTenant)
      throw new AppError(
        'Não foi possível arquivar o estabelecimento.',
        500,
        'TENANT_UPDATE_FAILED',
      );
    return response.json({
      success: true,
      data: { ...updatedTenant, metrics: presentMetrics(await rawTenantMetrics(tenantId)) },
    });
  }

  async restoreTenant(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const tenantId = tenantIdFrom(request);
    const input = restoreSchema.parse(request.body);
    const updatedTenant = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .for('update');
      if (!tenant) throw new AppError('Estabelecimento não encontrado.', 404, 'TENANT_NOT_FOUND');
      if (tenant.status !== 'ARCHIVED') {
        throw new AppError(
          'Somente estabelecimentos arquivados podem ser restaurados.',
          409,
          'TENANT_NOT_ARCHIVED',
        );
      }
      const now = new Date();
      const [updated] = await tx
        .update(tenants)
        .set({
          status: input.status,
          archivedAt: null,
          pausedAt: input.status === 'PAUSED' ? (tenant.pausedAt ?? now) : null,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          phone: tenants.phone,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          status: tenants.status,
          createdAt: tenants.createdAt,
          pausedAt: tenants.pausedAt,
          archivedAt: tenants.archivedAt,
        });
      await writeAudit(tx, adminId, 'TENANT_RESTORED', input.reason, tenantId, {
        from: 'ARCHIVED',
        to: input.status,
      });
      return updated;
    });
    if (!updatedTenant)
      throw new AppError(
        'Não foi possível restaurar o estabelecimento.',
        500,
        'TENANT_UPDATE_FAILED',
      );
    return response.json({
      success: true,
      data: { ...updatedTenant, metrics: presentMetrics(await rawTenantMetrics(tenantId)) },
    });
  }

  async listTenantAudit(request: Request, response: Response): Promise<Response> {
    const adminId = requestAdminId(request);
    const { tenantId, limit } = auditQuerySchema.parse(request.query);
    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) throw new AppError('Estabelecimento não encontrado.', 404, 'TENANT_NOT_FOUND');

    const rows = await db
      .select({
        id: platformAuditLogs.id,
        action: platformAuditLogs.action,
        reason: platformAuditLogs.reason,
        metadata: platformAuditLogs.metadata,
        createdAt: platformAuditLogs.createdAt,
        adminName: platformAdmins.name,
      })
      .from(platformAuditLogs)
      .innerJoin(platformAdmins, eq(platformAuditLogs.platformAdminId, platformAdmins.id))
      .where(eq(platformAuditLogs.tenantId, tenantId))
      .orderBy(desc(platformAuditLogs.createdAt))
      .limit(limit);
    await writeStandaloneAudit(
      adminId,
      'TENANT_AUDIT_VIEWED',
      'Histórico de auditoria do estabelecimento consultado.',
      tenantId,
      { limit },
    );
    return response.json({ success: true, data: rows });
  }
}
