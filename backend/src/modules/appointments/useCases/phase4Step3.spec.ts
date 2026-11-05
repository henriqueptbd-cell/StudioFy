import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../shared/providers/AuthProvider.js';
import { db, withTenant } from '../../../db/client.js';
import { scheduleConfigs, services, tenants, users } from '../../../db/schema.js';
import { routes } from '../../../routes/index.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('Suite de Testes de Integração - FASE 4 (Passo 3 - Fluxo de Agendamento)', () => {
    let tenantSlug = '';
    let tenantId = '';
    let serviceId = '';
    let adminToken = '';
    let professionalToken = '';
    let professionalId = '';
    let appointmentId = '';
    let replacementAppointmentId = '';
    let targetStartTime = '';

    beforeAll(async () => {
        tenantSlug = `studio-flow-${Date.now()}`;

        const [tenant] = await db.insert(tenants).values({ name: 'Studio Flow Test', slug: tenantSlug, phone: '11999998888' }).returning();
        if (!tenant) {
            throw new Error('Tenant não foi criado');
        }
        tenantId = tenant.id;

        await withTenant(tenantId, async (tx) => {
            const passwordHash = await AuthProvider.hashPassword('senha_segura_123');
            const [admin] = await tx.insert(users).values({ tenantId, name: 'Admin Flow', email: `admin-${Date.now()}@flow.com`, passwordHash, role: 'ADMIN' }).returning();
            if (!admin) {
                throw new Error('Admin não foi criado');
            }
            adminToken = AuthProvider.generateToken({ sub: admin.id, tenantId, role: 'ADMIN' });

            const [professional] = await tx.insert(users).values({
                tenantId,
                name: 'Profissional Flow',
                email: `professional-${Date.now()}@flow.com`,
                passwordHash,
                role: 'PROFESSIONAL',
                active: true,
            }).returning();
            if (!professional) {
                throw new Error('Profissional não foi criado');
            }
            professionalId = professional.id;
            professionalToken = AuthProvider.generateToken({ sub: professional.id, tenantId, role: 'PROFESSIONAL' });

            const [service] = await tx.insert(services).values({ tenantId, name: 'Corte Premium', durationMinutes: 30, price: '60.00', active: true }).returning();
            if (!service) {
                throw new Error('Serviço não foi criado');
            }
            serviceId = service.id;

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

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 2);
        targetDate.setUTCHours(14, 0, 0, 0);
        targetStartTime = targetDate.toISOString();
    });

    it('1. [PUBLIC] Deve criar um novo agendamento com status PENDENTE (201 Created)', async () => {
        const response = await request(app)
            .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
            .send({
                serviceId,
                startTime: targetStartTime,
                customer: { name: 'Cliente Teste', phone: '11988887777' },
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('PENDENTE');
        appointmentId = response.body.data.id;
    });

    it('2. [PUBLIC] Deve rejeitar agendamento duplicado no mesmo slot (409 Conflict)', async () => {
        const response = await request(app)
            .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
            .send({
                serviceId,
                startTime: targetStartTime,
                customer: { name: 'Outro Cliente', phone: '11977776666' },
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('2.1. [PUBLIC] Deve rejeitar agendamento para mais de 30 dias (400 Bad Request)', async () => {
        const farFuture = new Date();
        farFuture.setDate(farFuture.getDate() + 35);
        farFuture.setUTCHours(14, 0, 0, 0);

        const response = await request(app)
            .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
            .send({
                serviceId,
                startTime: farFuture.toISOString(),
                customer: { name: 'Cliente Futuro', phone: '11966664444' },
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('DATE_OUT_OF_RANGE');
    });

    it('3. [ADMIN] Deve confirmar o agendamento PENDENTE -> CONFIRMADO (200 OK)', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CONFIRMADO' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('CONFIRMADO');
    });

    it('3.1 [PROFESSIONAL] Deve consultar recursos permitidos, mas não administrar serviços, equipe ou configurações', async () => {
        const readResponses = await Promise.all([
            request(app).get('/api/v1/admin/appointments').set('Authorization', `Bearer ${professionalToken}`),
            request(app).get('/api/v1/admin/services').set('Authorization', `Bearer ${professionalToken}`),
            request(app).get('/api/v1/admin/customers').set('Authorization', `Bearer ${professionalToken}`),
            request(app).get('/api/v1/admin/team').set('Authorization', `Bearer ${professionalToken}`),
            request(app).get('/api/v1/admin/settings').set('Authorization', `Bearer ${professionalToken}`),
        ]);
        expect(readResponses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);

        const adminOnlyResponses = await Promise.all([
            request(app).post('/api/v1/admin/services')
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({ name: 'Serviço não autorizado', durationMinutes: 30, price: 10 }),
            request(app).patch(`/api/v1/admin/services/${serviceId}`)
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({ active: false }),
            request(app).post('/api/v1/admin/team')
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({ name: 'Não autorizado', email: 'denied@flow.com', password: 'senha_segura_123', role: 'PROFESSIONAL' }),
            request(app).patch(`/api/v1/admin/team/${professionalId}`)
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({ active: false }),
            request(app).put('/api/v1/admin/settings/profile')
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({}),
            request(app).put('/api/v1/admin/settings/schedule')
                .set('Authorization', `Bearer ${professionalToken}`)
                .send({ days: [] }),
        ]);
        expect(adminOnlyResponses.map((response) => response.status)).toEqual([403, 403, 403, 403, 403, 403]);
    });

    it('4. [PROFESSIONAL] Deve rejeitar transição inválida CONFIRMADO -> RECUSADO (400 Bad Request)', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'RECUSADO' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('5. [ADMIN] Deve listar a agenda do tenant com link wa.me (200 OK)', async () => {
        const response = await request(app)
            .get(`/api/v1/admin/appointments`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    whatsappLink: expect.stringContaining('wa.me/5511988887777'),
                }),
            ]),
        );
    });

    it('6. [PROFESSIONAL] Deve cancelar atendimento CONFIRMADO -> CANCELADO (200 OK)', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'CANCELADO' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('CANCELADO');
    });

    it('7. [PUBLIC] Deve liberar o slot depois do cancelamento (201 Created)', async () => {
        const response = await request(app)
            .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
            .send({
                serviceId,
                startTime: targetStartTime,
                customer: { name: 'Novo Cliente', phone: '11966665555' },
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('PENDENTE');
        replacementAppointmentId = response.body.data.id;
    });

    it('8. [PROFESSIONAL] Deve confirmar e concluir atendimento (200 OK)', async () => {
        const confirmResponse = await request(app)
            .patch(`/api/v1/admin/appointments/${replacementAppointmentId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'CONFIRMADO' });

        expect(confirmResponse.status).toBe(200);

        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${replacementAppointmentId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'CONCLUIDO' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('CONCLUIDO');
    });

    it('9. [PROFESSIONAL] Deve recusar e cancelar solicitações PENDENTE (200 OK)', async () => {
        const createPendingAppointment = async (name: string, phone: string): Promise<string> => {
            const response = await request(app)
                .post(`/api/v1/public/tenants/${tenantSlug}/appointments`)
                .send({ serviceId, startTime: targetStartTime, customer: { name, phone } });

            expect(response.status).toBe(201);
            return String(response.body.data.id);
        };

        const rejectedId = await createPendingAppointment('Cliente Recusado', '11966664444');
        const rejection = await request(app)
            .patch(`/api/v1/admin/appointments/${rejectedId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'RECUSADO' });
        expect(rejection.status).toBe(200);
        expect(rejection.body.data.status).toBe('RECUSADO');

        const invalidTerminalTransition = await request(app)
            .patch(`/api/v1/admin/appointments/${rejectedId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'CANCELADO' });
        expect(invalidTerminalTransition.status).toBe(400);
        expect(invalidTerminalTransition.body.error.code).toBe('INVALID_STATUS_TRANSITION');

        const pendingId = await createPendingAppointment('Cliente Cancelado', '11966663333');
        const cancellation = await request(app)
            .patch(`/api/v1/admin/appointments/${pendingId}/status`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ status: 'CANCELADO' });
        expect(cancellation.status).toBe(200);
        expect(cancellation.body.data.status).toBe('CANCELADO');
    });
});
