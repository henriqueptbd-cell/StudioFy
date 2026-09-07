import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db, withTenant } from '../../../db/client.js';
import { tenants, services, scheduleConfigs, users } from '../../../db/schema.js';
import { routes } from '../../../routes/index.js';
import { errorHandler } from '../../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../../shared/providers/AuthProvider.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('Suite de Testes de Integração - FASE 4 (Passo 1 e 2)', () => {
    let tenantSlug = '';
    let tenantId = '';
    let adminToken = '';
    let createdServiceId = '';
    let inactiveServiceId = '';

    beforeAll(async () => {
        tenantSlug = `studio-spec-${Date.now()}`;

        // 1. Setup: Criar Tenant de Teste
        const [insertedTenant] = await db
            .insert(tenants)
            .values({
                name: 'Studio Teste Specs',
                slug: tenantSlug,
                phone: '11988887777',
            })
            .returning();

        if (!insertedTenant) {
            throw new Error('Falha ao criar tenant no setup do teste.');
        }

        tenantId = insertedTenant.id;

        // No beforeAll de phase4Step1And2.spec.ts:
        await withTenant(tenantId, async (tx) => {
            // Criar Usuário Admin
            const passwordHash = await AuthProvider.hashPassword('senha_segura_123');
            const [admin] = await tx
                .insert(users)
                .values({
                    tenantId,
                    name: 'Admin do Studio',
                    email: `admin-${Date.now()}@studio.com`,
                    passwordHash,
                    role: 'ADMIN',
                })
                .returning();

            if (admin) {
                adminToken = AuthProvider.generateToken({
                    sub: admin.id,
                    tenantId,
                    role: 'ADMIN',
                });
            }

            // Criar um serviço base via DB para garantir ID nos testes 5 e 6
            const [baseService] = await tx
                .insert(services)
                .values({
                    tenantId,
                    name: 'Serviço Base',
                    durationMinutes: 30,
                    price: '50.00',
                    active: true,
                })
                .returning();

            if (baseService) {
                createdServiceId = baseService.id;
            }

            const [inactiveService] = await tx
                .insert(services)
                .values({
                    tenantId,
                    name: 'Serviço Inativo',
                    durationMinutes: 30,
                    price: '50.00',
                    active: false,
                })
                .returning();

            if (inactiveService) {
                inactiveServiceId = inactiveService.id;
            }

            // Configurar Horários de Funcionamento (Segunda a Domingo, 08:00 às 18:00)
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
    });

    // ----------------------------------------------------
    // 1. MÓDULO DE SERVIÇOS (ADMIN)
    // ----------------------------------------------------
    it('1. [ADMIN] Deve cadastrar um novo serviço com sucesso (201 Created)', async () => {
        const response = await request(app)
            .post('/api/v1/admin/services')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Corte de Cabelo Masculino',
                description: 'Corte completo com lavagem',
                durationMinutes: 30,
                price: 45.0,
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe('Corte de Cabelo Masculino');

        createdServiceId = response.body.data.id;
    });

    it('2. [ADMIN] Deve rejeitar criação de serviço sem token de autenticação (401 Unauthorized)', async () => {
        const response = await request(app)
            .post('/api/v1/admin/services')
            .send({
                name: 'Serviço Não Autorizado',
                durationMinutes: 30,
                price: 30.0,
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    // ----------------------------------------------------
    // 2. MÓDULO PÚBLICO DO TENANT E SERVIÇOS
    // ----------------------------------------------------
    it('3. [PUBLIC] Deve retornar dados públicos do tenant pelo slug (200 OK)', async () => {
        const response = await request(app).get(`/api/v1/public/tenants/${tenantSlug}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe(tenantSlug);
        expect(response.body.data.name).toBe('Studio Teste Specs');
    });

    it('4. [PUBLIC] Deve retornar 404 ao buscar slug inexistente', async () => {
        const response = await request(app).get('/api/v1/public/tenants/slug-inexistente-123456');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('5. [PUBLIC] Deve listar apenas os serviços ativos do tenant (200 OK)', async () => {
        const response = await request(app).get(`/api/v1/public/tenants/${tenantSlug}/services`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: createdServiceId })]),
        );
        expect(response.body.data).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ id: inactiveServiceId })]),
        );
    });

    // ----------------------------------------------------
    // 3. CONSULTA PÚBLICA DE SLOTS
    // ----------------------------------------------------
    it('6. [PUBLIC] Deve consultar os slots disponíveis para uma data futura válida (200 OK)', async () => {
        // Gerar data para daqui a 5 dias (YYYY-MM-DD)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 5);
        const dateStr = targetDate.toISOString().split('T')[0];

        const response = await request(app).get(
            `/api/v1/public/tenants/${tenantSlug}/slots?date=${dateStr}&serviceId=${createdServiceId}`
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.date).toBe(dateStr);
        expect(Array.isArray(response.body.data.availableSlots)).toBe(true);
        expect(response.body.data.availableSlots.length).toBeGreaterThan(0);
        expect(response.body.data.availableSlots).toContain('08:00');
    });

    it('7. [PUBLIC] Deve rejeitar consulta de slots com parâmetros ausentes (400 Bad Request)', async () => {
        const response = await request(app).get(`/api/v1/public/tenants/${tenantSlug}/slots`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_QUERY_PARAMS');
    });
});