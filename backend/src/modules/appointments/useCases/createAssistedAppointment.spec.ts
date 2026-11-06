import { beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import {
  appointments,
  customers,
  scheduleConfigs,
  services,
  tenants,
  users,
} from '../../../db/schema.js';
import { db, withTenant } from '../../../db/client.js';
import { routes } from '../../../routes/index.js';
import { errorHandler } from '../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../shared/providers/AuthProvider.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('POST /api/v1/admin/appointments — agendamento assistido', () => {
  let tenantId = '';
  let serviceId = '';
  let inactiveServiceId = '';
  let adminToken = '';
  let professionalToken = '';
  let professionalId = '';
  let otherTenantCustomerId = '';
  let otherTenantProfessionalId = '';
  let existingCustomerId = '';
  let baseStart = new Date();

  const atMinute = (minute: number): string => {
    const date = new Date(baseStart);
    date.setUTCMinutes(date.getUTCMinutes() + minute);
    return date.toISOString();
  };

  const postAsAdmin = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const waitForAdvisoryLockWaiters = async (expected: number): Promise<void> => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await db.execute<{ waiting: number }>(sql`
        SELECT COUNT(*)::int AS waiting
        FROM pg_locks
        WHERE locktype = 'advisory'
          AND granted = false
          AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
          AND objsubid = 1
          AND classid = (((hashtextextended(${tenantId}::text, 0) >> 32) & 4294967295)::oid)
          AND objid = ((hashtextextended(${tenantId}::text, 0) & 4294967295)::oid)
      `);
      if ((result.rows[0]?.waiting ?? 0) >= expected) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('As duas requisições não chegaram ao trigger de conflito dentro do prazo.');
  };

  beforeAll(async () => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Studio Assistido Teste', slug: `assistido-${stamp}`, phone: '11999991111' })
      .returning();
    if (!tenant) throw new Error('Tenant de teste não foi criado');
    tenantId = tenant.id;

    const [otherTenant] = await db
      .insert(tenants)
      .values({
        name: 'Outro Studio Assistido',
        slug: `assistido-outro-${stamp}`,
        phone: '11999992222',
      })
      .returning();
    if (!otherTenant) throw new Error('Segundo tenant de teste não foi criado');

    const passwordHash = await AuthProvider.hashPassword('senha_de_teste_segura');
    await withTenant(tenantId, async (tx) => {
      const [admin] = await tx
        .insert(users)
        .values({
          tenantId,
          name: 'Admin Assistido',
          email: `admin-${stamp}@assistido.test`,
          passwordHash,
          role: 'ADMIN',
        })
        .returning();
      const [professional] = await tx
        .insert(users)
        .values({
          tenantId,
          name: 'Profissional Assistido',
          email: `pro-${stamp}@assistido.test`,
          passwordHash,
          role: 'PROFESSIONAL',
          active: true,
        })
        .returning();
      const [service] = await tx
        .insert(services)
        .values({
          tenantId,
          name: 'Serviço Assistido',
          durationMinutes: 30,
          price: '50.00',
          active: true,
        })
        .returning();
      const [inactiveService] = await tx
        .insert(services)
        .values({
          tenantId,
          name: 'Serviço Inativo Assistido',
          durationMinutes: 30,
          price: '40.00',
          active: false,
        })
        .returning();
      const [customer] = await tx
        .insert(customers)
        .values({
          tenantId,
          name: 'Cliente Existente',
          phone: '11988887777',
        })
        .returning();
      if (!admin || !professional || !service || !inactiveService || !customer)
        throw new Error('Fixture do tenant não criada');

      adminToken = AuthProvider.generateToken({ sub: admin.id, tenantId, role: 'ADMIN' });
      professionalId = professional.id;
      professionalToken = AuthProvider.generateToken({
        sub: professional.id,
        tenantId,
        role: 'PROFESSIONAL',
      });
      serviceId = service.id;
      inactiveServiceId = inactiveService.id;
      existingCustomerId = customer.id;

      for (let day = 0; day <= 6; day++) {
        await tx.insert(scheduleConfigs).values({
          tenantId,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: '18:00',
          isClosed: false,
        });
      }
    });
    await withTenant(otherTenant.id, async (tx) => {
      const [customer] = await tx
        .insert(customers)
        .values({
          tenantId: otherTenant.id,
          name: 'Cliente de Outro Tenant',
          phone: '11977776666',
        })
        .returning();
      const [professional] = await tx
        .insert(users)
        .values({
          tenantId: otherTenant.id,
          name: 'Profissional de Outro Tenant',
          email: `pro-outro-${stamp}@assistido.test`,
          passwordHash,
          role: 'PROFESSIONAL',
          active: true,
        })
        .returning();
      if (!customer || !professional) throw new Error('Fixture do segundo tenant não criada');
      otherTenantCustomerId = customer.id;
      otherTenantProfessionalId = professional.id;
    });

    // Um dia futuro em horário comercial de São Paulo (11:00 local), com
    // minutos reservados por teste para evitar dependência da ordem por slot.
    baseStart = new Date();
    baseStart.setUTCDate(baseStart.getUTCDate() + 4);
    baseStart.setUTCHours(14, 0, 0, 0);
  });

  it('ADMIN cria cadastro rápido; appointment fica CONFIRMADO sem expiração e normaliza os dados', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(0),
      customer: { name: '  Nova Cliente  ', phone: '(11) 96666-5555' },
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'CONFIRMADO', expiresAt: null },
    });
    expect(response.body.data.professionalId).toBeNull();
    const [customer] = await withTenant(tenantId, (tx) =>
      tx.select().from(customers).where(eq(customers.id, response.body.data.customerId)),
    );
    expect(customer).toMatchObject({ name: 'Nova Cliente', phone: '11966665555' });
  });

  it('PROFESSIONAL cria e é sempre associado a si mesmo', async () => {
    const response = await request(app)
      .post('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        serviceId,
        startTime: atMinute(60),
        customer: { name: 'Cliente Profissional', phone: '11955554444' },
      });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'CONFIRMADO',
      expiresAt: null,
      professionalId,
    });
  });

  it('reutiliza cliente existente por customerId sem duplicá-lo', async () => {
    const before = await withTenant(tenantId, (tx) => tx.select().from(customers));
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(120),
      customerId: existingCustomerId,
    });
    const after = await withTenant(tenantId, (tx) => tx.select().from(customers));
    expect(response.status).toBe(201);
    expect(response.body.data.customerId).toBe(existingCustomerId);
    expect(after).toHaveLength(before.length);
  });

  it('ADMIN pode atribuir profissional ativo do mesmo tenant', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(180),
      customer: { name: 'Cliente Atribuído', phone: '11944443333' },
      professionalId,
    });
    expect(response.status).toBe(201);
    expect(response.body.data.professionalId).toBe(professionalId);
  });

  it('rejeita que PROFESSIONAL tente atribuir outro profissional', async () => {
    const response = await request(app)
      .post('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        serviceId,
        startTime: atMinute(240),
        customer: { name: 'Cliente Sem Atribuição', phone: '11933332222' },
        professionalId: otherTenantProfessionalId,
      });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN_PROFESSIONAL_ASSIGNMENT');
  });

  it('rejeita customerId de outro tenant', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(240),
      customerId: otherTenantCustomerId,
    });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('rejeita professionalId de outro tenant', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(270),
      customer: { name: 'Cliente com Profissional Externo', phone: '11922221111' },
      professionalId: otherTenantProfessionalId,
    });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROFESSIONAL_NOT_FOUND');
  });

  it('rejeita conflito com appointment confirmado', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(0),
      customer: { name: 'Cliente Conflitante', phone: '11911112222' },
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('rejeita payload inválido e horários fora das regras, mas permite agendamento assistido a seis meses', async () => {
    const missingCustomer = await postAsAdmin({ serviceId, startTime: atMinute(300) });
    const bothCustomerSources = await postAsAdmin({
      serviceId,
      startTime: atMinute(300),
      customerId: existingCustomerId,
      customer: { name: 'Duplicidade', phone: '11911113333' },
    });
    const tooSoon = await postAsAdmin({
      serviceId,
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      customer: { name: 'Data Curta', phone: '11911114444' },
    });
    const outsideHours = await postAsAdmin({
      serviceId,
      startTime: (() => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() + 4);
        date.setUTCHours(5, 0, 0, 0);
        return date.toISOString();
      })(),
      customer: { name: 'Fora Horário', phone: '11911115555' },
    });
    const assistedDate = new Date();
    assistedDate.setUTCDate(assistedDate.getUTCDate() + 180);
    assistedDate.setUTCHours(14, 0, 0, 0);
    const beyondPublicWindow = await postAsAdmin({
      serviceId,
      startTime: assistedDate.toISOString(),
      customer: { name: 'Data Distante', phone: '11911117777' },
    });
    const inactiveService = await postAsAdmin({
      serviceId: inactiveServiceId,
      startTime: atMinute(360),
      customer: { name: 'Serviço Inativo', phone: '11911118888' },
    });
    expect(missingCustomer.status).toBe(400);
    expect(bothCustomerSources.status).toBe(400);
    expect(tooSoon.status).toBe(400);
    expect(tooSoon.body.error.code).toBe('MIN_ADVANCE_TIME');
    expect(outsideHours.status).toBe(400);
    expect(outsideHours.body.error.code).toBe('OUT_OF_BUSINESS_HOURS');
    expect(beyondPublicWindow.status).toBe(201);
    expect(beyondPublicWindow.body.data.status).toBe('CONFIRMADO');
    expect(inactiveService.status).toBe(404);
    expect(inactiveService.body.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('mapeia corrida no banco para 409 SLOT_UNAVAILABLE sem aceitar duas reservas', async () => {
    const body = {
      serviceId,
      startTime: atMinute(360),
      customer: { name: 'Cliente Concorrente', phone: '11911119999' },
    };
    let concurrentResponses: Promise<Awaited<ReturnType<typeof postAsAdmin>>[]> | undefined;
    await withTenant(tenantId, async (tx) => {
      // Mantém o advisory lock até ambas as inserções esperarem dentro do trigger,
      // garantindo que o segundo resultado exercite o mapeamento de SQLSTATE P0001.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}::text, 0))`);
      concurrentResponses = Promise.all([postAsAdmin(body), postAsAdmin(body)]);
      await waitForAdvisoryLockWaiters(2);
    });
    if (!concurrentResponses) throw new Error('As requisições concorrentes não foram iniciadas.');
    const responses = await concurrentResponses;
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const conflict = responses.find((response) => response.status === 409);
    expect(conflict?.body.error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('mantém o cliente no tenant e retorna 201 padrão', async () => {
    const response = await postAsAdmin({
      serviceId,
      startTime: atMinute(300),
      customer: { name: 'Cliente Resposta Padrão', phone: '11911116666' },
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({ status: 'CONFIRMADO', expiresAt: null }),
    });
    const rows = await withTenant(tenantId, (tx) => tx.select().from(appointments));
    expect(rows.some((appointment) => appointment.id === response.body.data.id)).toBe(true);
  });
});
