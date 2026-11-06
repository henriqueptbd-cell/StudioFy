import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { appointments, scheduleConfigs, services, tenants, users } from '../../../db/schema.js';
import { db, withTenant } from '../../../db/client.js';
import { routes } from '../../../routes/index.js';
import { errorHandler } from '../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../shared/providers/AuthProvider.js';

type BookingFixture = {
  tenantId: string;
  slug: string;
  serviceId: string;
  adminId: string;
  adminToken: string;
  professionalToken: string;
};

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

const createdTenantIds: string[] = [];

function assertLocalTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Defina DATABASE_URL para um PostgreSQL local de teste (studiofy_e2e/CI).');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  const localHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
  if (!localHosts.has(parsed.hostname) || !/(?:_test|_e2e)$/i.test(databaseName)) {
    throw new Error(
      'Teste de janela bloqueado: use somente PostgreSQL local com database _test ou _e2e.',
    );
  }
}

function saoPauloDate(daysAhead = 0): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day') + daysAhead));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function localAppointmentTime(date: string, hour = 11): string {
  // Fixtures de agendamento usam sempre o relógio local do tenant (America/Sao_Paulo).
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00-03:00`).toISOString();
}

async function createFixture(): Promise<BookingFixture> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const slug = `janela-${suffix}`;
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Studio Janela Teste',
      slug,
      phone: '5511999999999',
      timezone: 'America/Sao_Paulo',
    })
    .returning();
  if (!tenant) throw new Error('Tenant de teste não foi criado');
  createdTenantIds.push(tenant.id);

  const passwordHash = await AuthProvider.hashPassword('Senha-T3ste-Booking!');
  return withTenant(tenant.id, async (tx) => {
    const [admin] = await tx
      .insert(users)
      .values({
        tenantId: tenant.id,
        name: 'Admin Janela',
        email: `admin-${suffix}@janela.test`,
        passwordHash,
        role: 'ADMIN',
      })
      .returning();
    const [professional] = await tx
      .insert(users)
      .values({
        tenantId: tenant.id,
        name: 'Profissional Janela',
        email: `pro-${suffix}@janela.test`,
        passwordHash,
        role: 'PROFESSIONAL',
        active: true,
      })
      .returning();
    const [service] = await tx
      .insert(services)
      .values({
        tenantId: tenant.id,
        name: 'Serviço Janela',
        durationMinutes: 30,
        price: '50.00',
        active: true,
      })
      .returning();
    if (!admin || !professional || !service)
      throw new Error('Fixture de equipe/serviço não foi criada');

    for (let day = 0; day <= 6; day++) {
      await tx.insert(scheduleConfigs).values({
        tenantId: tenant.id,
        dayOfWeek: day,
        openTime: '08:00',
        closeTime: '18:00',
        isClosed: false,
      });
    }

    return {
      tenantId: tenant.id,
      slug,
      serviceId: service.id,
      adminId: admin.id,
      adminToken: AuthProvider.generateToken({ sub: admin.id, tenantId: tenant.id, role: 'ADMIN' }),
      professionalToken: AuthProvider.generateToken({
        sub: professional.id,
        tenantId: tenant.id,
        role: 'PROFESSIONAL',
      }),
    };
  });
}

function putWindow(
  fixture: BookingFixture,
  publicBookingUntil: string,
  token = fixture.adminToken,
) {
  return request(app)
    .put('/api/v1/admin/settings/booking-window')
    .set('Authorization', `Bearer ${token}`)
    .send({ publicBookingUntil });
}

async function publicSlots(fixture: BookingFixture, date: string) {
  return request(app)
    .get(`/api/v1/public/tenants/${fixture.slug}/slots`)
    .query({ date, serviceId: fixture.serviceId });
}

afterEach(async () => {
  while (createdTenantIds.length > 0) {
    const tenantId = createdTenantIds.pop();
    if (tenantId) await db.delete(tenants).where(eq(tenants.id, tenantId));
  }
});

describe('janela de agendamento público — contrato de integração', () => {
  it('expõe o default SQL de 30 dias e o provisionamento define hoje local +30', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();

    const response = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`);

    expect(response.status).toBe(200);
    const databaseDefault = await db.execute<{ expected: string }>(sql`
      SELECT (CURRENT_DATE + 30)::text AS expected
    `);
    expect(response.body.data.tenant.publicBookingUntil).toBe(databaseDefault.rows[0]?.expected);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const provisionedResponse = await request(app)
      .post('/api/v1/public/tenants/provision')
      .send({
        tenant: {
          name: 'Tenant Provisionado',
          slug: `provisionado-${suffix}`,
          phone: '11999999999',
        },
        admin: {
          name: 'Admin Provisionado',
          email: `admin-${suffix}@provisionado.test`,
          password: 'Senha-provisionada-123!',
        },
      });
    expect(provisionedResponse.status).toBe(201);
    const provisionedTenantId = provisionedResponse.body.data.tenant.id as string;
    createdTenantIds.push(provisionedTenantId);
    const [provisionedTenant] = await db
      .select({ publicBookingUntil: tenants.publicBookingUntil })
      .from(tenants)
      .where(eq(tenants.id, provisionedTenantId));
    expect(provisionedTenant?.publicBookingUntil).toBe(saoPauloDate(30));
  });

  it('permite atualização por ADMIN e PROFESSIONAL e retorna a data configurada', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();
    const adminDate = saoPauloDate(12);
    const professionalDate = saoPauloDate(14);

    const adminUpdate = await putWindow(fixture, adminDate);
    expect(adminUpdate.status).toBe(200);
    expect(adminUpdate.body.data.publicBookingUntil).toBe(adminDate);

    const professionalUpdate = await putWindow(
      fixture,
      professionalDate,
      fixture.professionalToken,
    );
    expect(professionalUpdate.status).toBe(200);
    expect(professionalUpdate.body.data.publicBookingUntil).toBe(professionalDate);
  });

  it('rejeita data inválida, passada e superior a 90 dias sem alterar a janela', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();
    const allowedDate = saoPauloDate(20);
    const initial = await putWindow(fixture, allowedDate);
    expect(initial.status).toBe(200);

    const invalidResponses = await Promise.all([
      putWindow(fixture, 'data-invalida'),
      putWindow(fixture, '2026-02-30'),
      putWindow(fixture, saoPauloDate(-1)),
      putWindow(fixture, saoPauloDate(91)),
    ]);
    expect(invalidResponses.map((response) => response.status)).toEqual([400, 400, 400, 400]);

    const settings = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(settings.body.data.tenant.publicBookingUntil).toBe(allowedDate);
  });

  it('rejeita chamada não autenticada e tenantId extra; o caller não seleciona nem altera outro tenant', async () => {
    assertLocalTestDatabase();
    const caller = await createFixture();
    const otherTenant = await createFixture();
    const otherDefault = saoPauloDate(30);

    const unauthenticated = await request(app)
      .put('/api/v1/admin/settings/booking-window')
      .send({ publicBookingUntil: saoPauloDate(10) });
    expect(unauthenticated.status).toBe(401);

    const unauthorizedRoleToken = AuthProvider.generateToken({
      sub: caller.adminId,
      tenantId: caller.tenantId,
      role: 'VIEWER' as 'ADMIN',
    });
    const forbiddenRole = await putWindow(caller, saoPauloDate(10), unauthorizedRoleToken);
    expect(forbiddenRole.status).toBe(403);

    const tenantOverride = await request(app)
      .put('/api/v1/admin/settings/booking-window')
      .set('Authorization', `Bearer ${caller.adminToken}`)
      .send({ publicBookingUntil: saoPauloDate(10), tenantId: otherTenant.tenantId });
    expect(tenantOverride.status).toBe(400);

    const callerSettings = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${caller.adminToken}`);
    const otherSettings = await request(app)
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${otherTenant.adminToken}`);
    expect(callerSettings.body.data.tenant.publicBookingUntil).toBe(saoPauloDate(30));
    expect(otherSettings.body.data.tenant.publicBookingUntil).toBe(otherDefault);
  });

  it('aceita o limite inclusivo, mas recusa slots e criação pública no dia seguinte', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();
    const publicBookingUntil = saoPauloDate(5);
    const afterWindow = saoPauloDate(6);
    const update = await putWindow(fixture, publicBookingUntil);
    expect(update.status).toBe(200);

    const inclusiveSlots = await publicSlots(fixture, publicBookingUntil);
    expect(inclusiveSlots.status).toBe(200);
    expect(inclusiveSlots.body.data.availableSlots).toContain('11:00');

    const inclusiveBooking = await request(app)
      .post(`/api/v1/public/tenants/${fixture.slug}/appointments`)
      .send({
        serviceId: fixture.serviceId,
        startTime: localAppointmentTime(publicBookingUntil),
        customer: { name: 'Cliente Limite Inclusivo', phone: '11991000001' },
      });
    expect(inclusiveBooking.status, JSON.stringify(inclusiveBooking.body)).toBe(201);

    const outsideSlots = await publicSlots(fixture, afterWindow);
    expect(outsideSlots.status).toBe(400);
    expect(outsideSlots.body.error.code).toBe('DATE_OUT_OF_RANGE');

    const outsideBooking = await request(app)
      .post(`/api/v1/public/tenants/${fixture.slug}/appointments`)
      .send({
        serviceId: fixture.serviceId,
        startTime: localAppointmentTime(afterWindow),
        customer: { name: 'Cliente Fora da Janela', phone: '11991000002' },
      });
    expect(outsideBooking.status).toBe(400);
    expect(outsideBooking.body.error.code).toBe('DATE_OUT_OF_RANGE');
  });

  it('slots autenticados e POST assistido funcionam além da janela, respeitando expediente, antecedência e conflito', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();
    const publicBookingUntil = saoPauloDate(3);
    const assistedDate = saoPauloDate(6);
    const update = await putWindow(fixture, publicBookingUntil);
    expect(update.status).toBe(200);

    const assistedDayOfWeek = new Date(`${assistedDate}T00:00:00.000Z`).getUTCDay();
    await withTenant(fixture.tenantId, (tx) =>
      tx
        .update(scheduleConfigs)
        .set({ openTime: '09:00', closeTime: '17:00' })
        .where(
          and(
            eq(scheduleConfigs.tenantId, fixture.tenantId),
            eq(scheduleConfigs.dayOfWeek, assistedDayOfWeek),
          ),
        ),
    );

    const assistedSlots = await request(app)
      .get('/api/v1/admin/appointments/available-slots')
      .query({ date: assistedDate, serviceId: fixture.serviceId })
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(assistedSlots.status).toBe(200);
    expect(assistedSlots.body.data.availableSlots).toContain('11:00');
    for (const label of assistedSlots.body.data.availableSlots as string[]) {
      expect(label >= '09:00' && label <= '16:30').toBe(true);
    }

    const closedDate = saoPauloDate(7);
    const closedDayOfWeek = new Date(`${closedDate}T00:00:00.000Z`).getUTCDay();
    await withTenant(fixture.tenantId, (tx) =>
      tx
        .update(scheduleConfigs)
        .set({ isClosed: true })
        .where(
          and(
            eq(scheduleConfigs.tenantId, fixture.tenantId),
            eq(scheduleConfigs.dayOfWeek, closedDayOfWeek),
          ),
        ),
    );
    const closedDaySlots = await request(app)
      .get('/api/v1/admin/appointments/available-slots')
      .query({ date: closedDate, serviceId: fixture.serviceId })
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(closedDaySlots.status).toBe(200);
    expect(closedDaySlots.body.data.availableSlots).toEqual([]);

    const sameDaySlots = await request(app)
      .get('/api/v1/admin/appointments/available-slots')
      .query({ date: saoPauloDate(), serviceId: fixture.serviceId })
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(sameDaySlots.status).toBe(200);
    const earliestPermitted = Date.now() + 2 * 60 * 60 * 1000;
    for (const label of sameDaySlots.body.data.availableSlots as string[]) {
      const slotInstant = new Date(localAppointmentTime(saoPauloDate(), Number(label.slice(0, 2))));
      slotInstant.setUTCMinutes(Number(label.slice(3, 5)));
      expect(slotInstant.getTime()).toBeGreaterThanOrEqual(earliestPermitted - 60_000);
    }

    const created = await request(app)
      .post('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${fixture.adminToken}`)
      .send({
        serviceId: fixture.serviceId,
        startTime: localAppointmentTime(assistedDate),
        customer: { name: 'Cliente Assistido Fora da Janela', phone: '11991000003' },
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data.status).toBe('CONFIRMADO');

    const slotsAfterBooking = await request(app)
      .get('/api/v1/admin/appointments/available-slots')
      .query({ date: assistedDate, serviceId: fixture.serviceId })
      .set('Authorization', `Bearer ${fixture.adminToken}`);
    expect(slotsAfterBooking.status).toBe(200);
    expect(slotsAfterBooking.body.data.availableSlots).not.toContain('11:00');
  });

  it('reduzir a janela não apaga nem cancela agendamento já existente', async () => {
    assertLocalTestDatabase();
    const fixture = await createFixture();
    const originalWindow = saoPauloDate(20);
    const reservedDate = saoPauloDate(12);
    const smallerWindow = saoPauloDate(5);
    const update = await putWindow(fixture, originalWindow);
    expect(update.status).toBe(200);

    const booking = await request(app)
      .post(`/api/v1/public/tenants/${fixture.slug}/appointments`)
      .send({
        serviceId: fixture.serviceId,
        startTime: localAppointmentTime(reservedDate),
        customer: { name: 'Reserva Persistente', phone: '11991000004' },
      });
    expect(booking.status, JSON.stringify(booking.body)).toBe(201);
    const appointmentId = booking.body.data.id as string;

    const shrink = await putWindow(fixture, smallerWindow);
    expect(shrink.status).toBe(200);
    expect(shrink.body.data.publicBookingUntil).toBe(smallerWindow);

    const [persistedAppointment] = await withTenant(fixture.tenantId, (tx) =>
      tx.select().from(appointments).where(eq(appointments.id, appointmentId)),
    );
    expect(persistedAppointment).toBeDefined();
    expect(persistedAppointment?.status).toBe('PENDENTE');
    expect(persistedAppointment?.startTime.toISOString().slice(0, 10)).toBe(
      localAppointmentTime(reservedDate).slice(0, 10),
    );

    const publicAttempt = await publicSlots(fixture, reservedDate);
    expect(publicAttempt.status).toBe(400);
    expect(publicAttempt.body.error.code).toBe('DATE_OUT_OF_RANGE');
  });
});
