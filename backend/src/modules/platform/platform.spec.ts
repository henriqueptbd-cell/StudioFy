import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, withTenant } from '../../db/client.js';
import {
  customers,
  platformAdmins,
  platformAuditLogs,
  services,
  tenants,
  users,
} from '../../db/schema.js';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../shared/providers/AuthProvider.js';
import { routes } from '../../routes/index.js';
import { PlatformAuthProvider } from './PlatformAuthProvider.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('Console da Plataforma — integração e fronteiras de segurança', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `platform-${suffix}@studiofy.test`;
  const adminPassword = 'platform-test-password-strong';
  const tenantAdminEmail = `salon-admin-${suffix}@studiofy.test`;
  const tenantAdminPassword = 'salon-test-password-strong';
  let tenantId = '';
  let tenantSlug = '';
  let serviceId = '';
  let tenantAdminToken = '';
  let platformToken = '';

  beforeAll(async () => {
    tenantSlug = `platform-test-${suffix}`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: 'Salão Teste Console',
        slug: tenantSlug,
        phone: '11912345678',
      })
      .returning();
    if (!tenant) throw new Error('Tenant de integração não foi criado.');
    tenantId = tenant.id;

    const platformPasswordHash = await PlatformAuthProvider.hashPassword(adminPassword);
    await db.insert(platformAdmins).values({
      name: 'Superadmin Integração',
      email: adminEmail,
      passwordHash: platformPasswordHash,
    });

    const tenantPasswordHash = await AuthProvider.hashPassword(tenantAdminPassword);
    await withTenant(tenantId, async (tx) => {
      const [tenantAdmin] = await tx
        .insert(users)
        .values({
          tenantId,
          name: 'Admin do Salão',
          email: tenantAdminEmail,
          passwordHash: tenantPasswordHash,
          role: 'ADMIN',
        })
        .returning({ id: users.id });
      if (!tenantAdmin) throw new Error('Admin do salão de integração não foi criado.');
      tenantAdminToken = AuthProvider.generateToken({
        sub: tenantAdmin.id,
        tenantId,
        role: 'ADMIN',
      });

      await tx.insert(customers).values([
        { tenantId, name: 'Cliente de teste um', phone: '11910000001' },
        { tenantId, name: 'Cliente de teste dois', phone: '11910000002' },
        { tenantId, name: 'Cliente de teste três', phone: '11910000003' },
      ]);
      const [service] = await tx
        .insert(services)
        .values({
          tenantId,
          name: 'Serviço de teste',
          durationMinutes: 30,
          price: '50.00',
        })
        .returning({ id: services.id });
      if (!service) throw new Error('Serviço de integração não foi criado.');
      serviceId = service.id;
    });
  });

  it('autentica uma identidade global e devolve sessão separada dos salões', async () => {
    const login = await request(app)
      .post('/api/v1/platform/auth/login')
      .send({ email: adminEmail.toUpperCase(), password: adminPassword });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data.admin).toMatchObject({
      email: adminEmail,
      name: 'Superadmin Integração',
    });
    expect(login.body.data).not.toHaveProperty('passwordHash');
    platformToken = login.body.data.token as string;

    const me = await request(app)
      .get('/api/v1/platform/me')
      .set('Authorization', `Bearer ${platformToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.admin.id).toBe(login.body.data.admin.id);
  });

  it('recusa JWT válido de usuário de salão na fronteira da plataforma', async () => {
    const response = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${tenantAdminToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_PLATFORM_TOKEN');
  });

  it('lista tenants e calcula métricas sob RLS, suprimindo grupos menores que cinco', async () => {
    const response = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ page: 1, pageSize: 20, q: tenantSlug });

    expect(response.status).toBe(200);
    expect(response.body.data.pagination.total).toBe(1);
    expect(response.body.data.items[0]).toMatchObject({
      id: tenantId,
      slug: tenantSlug,
      status: 'ACTIVE',
      metrics: {
        customerCount: null,
        activeServiceCount: null,
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
    });
    expect(JSON.stringify(response.body)).not.toContain('11910000001');
  });

  it('registra edição de perfil com motivo e sem permitir alterações fora da lista aprovada', async () => {
    const updated = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({
        name: 'Salão Atualizado',
        phone: '11987654321',
        reason: 'Correção solicitada pelo proprietário',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Salão Atualizado');
    expect(updated.body.data.slug).toBe(tenantSlug);

    const forbiddenField = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ slug: 'slug-alterado', reason: 'Tentativa inválida de alterar slug' });
    expect(forbiddenField.status).toBe(400);
  });

  it('pausa o tenant, bloqueia sessão existente, novo login e superfície pública', async () => {
    const paused = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/pause`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ reason: 'Pausa solicitada pelo responsável' });
    expect(paused.status).toBe(200);
    expect(paused.body.data.status).toBe('PAUSED');
    expect(paused.body.data.pausedAt).toBeTruthy();

    const existingSession = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${tenantAdminToken}`);
    expect(existingSession.status).toBe(403);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ tenantSlug, email: tenantAdminEmail, password: tenantAdminPassword });
    expect(newLogin.status).toBe(403);
    expect(newLogin.body.error.code).toBe('TENANT_INACTIVE');

    const publicPage = await request(app).get(`/api/v1/public/tenants/${tenantSlug}`);
    expect(publicPage.status).toBe(404);

    const publicBooking = await request(app)
      .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
      .send({
        serviceId,
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        customer: { name: 'Cliente teste', phone: '11912345678' },
      });
    expect(publicBooking.status).toBe(404);
  });

  it('reativa explicitamente o tenant e permite o acesso novamente', async () => {
    const reactivated = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/reactivate`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ reason: 'Pausa encerrada após revisão' });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.status).toBe('ACTIVE');
    expect(reactivated.body.data.pausedAt).toBeNull();

    const tenantLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ tenantSlug, email: tenantAdminEmail, password: tenantAdminPassword });
    expect(tenantLogin.status).toBe(200);
  });

  it('arquiva sem excluir, oculta da lista operacional e restaura para estado escolhido', async () => {
    const archived = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/archive`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ reason: 'Encerramento operacional temporário' });
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');
    expect(archived.body.data.archivedAt).toBeTruthy();

    const defaultList = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ q: tenantSlug });
    expect(defaultList.body.data.pagination.total).toBe(0);

    const archivedList = await request(app)
      .get('/api/v1/platform/tenants')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ q: tenantSlug, status: 'ARCHIVED' });
    expect(archivedList.body.data.items[0].id).toBe(tenantId);

    const restored = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/restore`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ status: 'PAUSED', reason: 'Conta arquivada restaurada e mantida pausada' });
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe('PAUSED');
    expect(restored.body.data.archivedAt).toBeNull();

    const [preservedTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    expect(preservedTenant?.id).toBe(tenantId);

    const reactivated = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/reactivate`)
      .set('Authorization', `Bearer ${platformToken}`)
      .send({ reason: 'Preparar o tenant para a próxima execução de testes' });
    expect(reactivated.body.data.status).toBe('ACTIVE');
  });

  it('expõe apenas o histórico administrativo do tenant e mantém registros append-only', async () => {
    const response = await request(app)
      .get('/api/v1/platform/audit-logs')
      .set('Authorization', `Bearer ${platformToken}`)
      .query({ tenantId, limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'TENANT_PROFILE_UPDATED',
          adminName: 'Superadmin Integração',
        }),
        expect.objectContaining({ action: 'TENANT_STATUS_CHANGED' }),
        expect.objectContaining({ action: 'TENANT_ARCHIVED' }),
        expect.objectContaining({ action: 'TENANT_RESTORED' }),
      ]),
    );

    await expect(
      db.delete(platformAuditLogs).where(eq(platformAuditLogs.tenantId, tenantId)),
    ).rejects.toThrow(/append-only/i);
  });
});
