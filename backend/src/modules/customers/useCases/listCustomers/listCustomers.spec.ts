import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../../shared/providers/AuthProvider.js';
import { db, withTenant } from '../../../../db/client.js';
import { customers, tenants, users } from '../../../../db/schema.js';
import { routes } from '../../../../routes/index.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('GET /api/v1/admin/customers', () => {
    let adminToken = '';
    let professionalToken = '';

    beforeAll(async () => {
        const slug = `studio-customers-${Date.now()}`;
        const [tenant] = await db
            .insert(tenants)
            .values({ name: 'Studio Customers Test', slug, phone: '11999995555' })
            .returning();
        if (!tenant) throw new Error('Tenant não foi criado');

        await withTenant(tenant.id, async (tx) => {
            const passwordHash = await AuthProvider.hashPassword('senha_segura_123');
            const [admin] = await tx
                .insert(users)
                .values({ tenantId: tenant.id, name: 'Admin Customers', email: `admin-${Date.now()}@customers.com`, passwordHash, role: 'ADMIN' })
                .returning();
            if (!admin) throw new Error('Admin não foi criado');
            adminToken = AuthProvider.generateToken({ sub: admin.id, tenantId: tenant.id, role: 'ADMIN' });

            const [professional] = await tx
                .insert(users)
                .values({ tenantId: tenant.id, name: 'Profissional Customers', email: `pro-${Date.now()}@customers.com`, passwordHash, role: 'PROFESSIONAL' })
                .returning();
            if (!professional) throw new Error('Profissional não foi criado');
            professionalToken = AuthProvider.generateToken({ sub: professional.id, tenantId: tenant.id, role: 'PROFESSIONAL' });

            await tx.insert(customers).values([
                { tenantId: tenant.id, name: 'Ana Souza', phone: '11988887777' },
                { tenantId: tenant.id, name: 'Ana S.', phone: '11988887777' },
                { tenantId: tenant.id, name: 'Bruno Lima', phone: '11977776666' },
            ]);
        });

        const otherSlug = `studio-customers-other-${Date.now()}`;
        const [otherTenant] = await db
            .insert(tenants)
            .values({ name: 'Outro Studio Customers', slug: otherSlug, phone: '11999994444' })
            .returning();
        if (!otherTenant) throw new Error('Outro tenant não foi criado');

        await withTenant(otherTenant.id, async (tx) => {
            await tx.insert(customers).values({
                tenantId: otherTenant.id,
                name: 'Carlos Outro Tenant',
                phone: '11966665555',
            });
        });
    });

    it('lista clientes do tenant sem vazar outro tenant', async () => {
        const response = await request(app)
            .get('/api/v1/admin/customers')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const names = response.body.data.map((c: { name: string }) => c.name);
        expect(names).toContain('Bruno Lima');
        expect(names.some((n: string) => n.startsWith('Ana'))).toBe(true);
        expect(names).not.toContain('Carlos Outro Tenant');
    });

    it('deduplica por telefone', async () => {
        const response = await request(app)
            .get('/api/v1/admin/customers')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        const phones = response.body.data.map((c: { phone: string }) => c.phone);
        expect(phones.filter((p: string) => p === '11988887777')).toHaveLength(1);
    });

    it('busca por nome', async () => {
        const response = await request(app)
            .get('/api/v1/admin/customers?search=Bruno')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Bruno Lima');
    });

    it('busca por telefone', async () => {
        const response = await request(app)
            .get('/api/v1/admin/customers?search=97777')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].phone).toBe('11977776666');
    });

    it('exige autenticação', async () => {
        const response = await request(app).get('/api/v1/admin/customers');
        expect(response.status).toBe(401);
    });

    it('permite leitura por PROFESSIONAL', async () => {
        const response = await request(app)
            .get('/api/v1/admin/customers')
            .set('Authorization', `Bearer ${professionalToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});
