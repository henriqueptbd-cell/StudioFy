import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';
import { db, withTenant } from '../../../../db/client.js';
import { services, tenants, users } from '../../../../db/schema.js';
import { routes } from '../../../../routes/index.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('PATCH /api/v1/admin/services/:id', () => {
    let tenantId = '';
    let serviceId = '';
    let adminToken = '';
    let professionalToken = '';
    let otherTenantServiceId = '';

    beforeAll(async () => {
        const slug = `studio-services-${Date.now()}`;

        const [tenant] = await db
            .insert(tenants)
            .values({ name: 'Studio Services Test', slug, phone: '11999997777' })
            .returning();
        if (!tenant) throw new Error('Tenant não foi criado');
        tenantId = tenant.id;

        await withTenant(tenantId, async (tx) => {
            const passwordHash = await AuthProvider.hashPassword('senha_segura_123');

            const [admin] = await tx
                .insert(users)
                .values({
                    tenantId,
                    name: 'Admin Services',
                    email: `admin-${Date.now()}@services.com`,
                    passwordHash,
                    role: 'ADMIN',
                })
                .returning();
            if (!admin) throw new Error('Admin não foi criado');
            adminToken = AuthProvider.generateToken({ sub: admin.id, tenantId, role: 'ADMIN' });

            const [professional] = await tx
                .insert(users)
                .values({
                    tenantId,
                    name: 'Profissional Services',
                    email: `pro-${Date.now()}@services.com`,
                    passwordHash,
                    role: 'PROFESSIONAL',
                })
                .returning();
            if (!professional) throw new Error('Profissional não foi criado');
            professionalToken = AuthProvider.generateToken({
                sub: professional.id,
                tenantId,
                role: 'PROFESSIONAL',
            });

            const [service] = await tx
                .insert(services)
                .values({ tenantId, name: 'Corte Simples', durationMinutes: 30, price: '40.00', active: true })
                .returning();
            if (!service) throw new Error('Serviço não foi criado');
            serviceId = service.id;
        });

        const otherSlug = `studio-services-other-${Date.now()}`;
        const [otherTenant] = await db
            .insert(tenants)
            .values({ name: 'Outro Studio', slug: otherSlug, phone: '11999996666' })
            .returning();
        if (!otherTenant) throw new Error('Outro tenant não foi criado');

        await withTenant(otherTenant.id, async (tx) => {
            const [otherService] = await tx
                .insert(services)
                .values({
                    tenantId: otherTenant.id,
                    name: 'Serviço Alheio',
                    durationMinutes: 30,
                    price: '10.00',
                    active: true,
                })
                .returning();
            if (!otherService) throw new Error('Serviço do outro tenant não foi criado');
            otherTenantServiceId = otherService.id;
        });
    });

    it('atualiza nome e preço do serviço', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Corte Premium', price: 75.5 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Corte Premium');
        expect(response.body.data.price).toBe('75.50');
    });

    it('ativa e desativa o serviço', async () => {
        const deactivate = await request(app)
            .patch(`/api/v1/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ active: false });

        expect(deactivate.status).toBe(200);
        expect(deactivate.body.data.active).toBe(false);

        const activate = await request(app)
            .patch(`/api/v1/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ active: true });

        expect(activate.status).toBe(200);
        expect(activate.body.data.active).toBe(true);
    });

    it('rejeita corpo vazio', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

        expect(response.status).toBe(400);
    });

    it('bloqueia usuário sem papel ADMIN', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/services/${serviceId}`)
            .set('Authorization', `Bearer ${professionalToken}`)
            .send({ name: 'Tentativa' });

        expect(response.status).toBe(403);
    });

    it('não permite editar serviço de outro tenant', async () => {
        const response = await request(app)
            .patch(`/api/v1/admin/services/${otherTenantServiceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Invasão' });

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('SERVICE_NOT_FOUND');
    });
});
