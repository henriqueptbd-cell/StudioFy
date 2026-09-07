import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../shared/providers/AuthProvider.js';
import { db, withTenant } from '../../../db/client.js';
import { services, tenants, users } from '../../../db/schema.js';
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
    let appointmentId = '';
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

            const [service] = await tx.insert(services).values({ tenantId, name: 'Corte Premium', durationMinutes: 30, price: '60.00', active: true }).returning();
            if (!service) {
                throw new Error('Serviço não foi criado');
            }
            serviceId = service.id;
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

    it('3. [ADMIN] Deve confirmar o agendamento PENDENTE -> CONFIRMADO (200 OK)', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'CONFIRMADO' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('CONFIRMADO');
    });

    it('4. [ADMIN] Deve rejeitar transição inválida CONFIRMADO -> RECUSADO (400 Bad Request)', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'RECUSADO' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
});