import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { routes } from '../../../../routes/index.js';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

// Cria uma instância leve do Express para executar os testes
const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('Suite de Testes de Integração - FASE 3 (Segurança & Autenticação)', () => {
    const uniqueSlug = `barbearia-test-${Date.now()}`;
    const testEmail = `admin-${Date.now()}@teste.com`;
    let authToken = '';

    it('1. Deve provisionar um novo Tenant + Admin com sucesso (201 Created)', async () => {
        const response = await request(app)
            .post('/api/v1/public/tenants/provision')
            .send({
                tenant: {
                    name: 'Barbearia de Teste Automatizado',
                    slug: uniqueSlug,
                    phone: '11999999999',
                },
                admin: {
                    name: 'Admin Teste',
                    email: testEmail,
                    password: 'senha_segura_123',
                },
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data.tenant.slug).toBe(uniqueSlug);
    });

    it('2. Deve impedir o cadastro duplicado usando o mesmo Slug (409 Conflict)', async () => {
        const response = await request(app)
            .post('/api/v1/public/tenants/provision')
            .send({
                tenant: {
                    name: 'Outra Barbearia',
                    slug: uniqueSlug, // Mesmo slug do teste anterior
                    phone: '11988888888',
                },
                admin: {
                    name: 'Outro Admin',
                    email: 'outro@teste.com',
                    password: 'senha_segura_123',
                },
            });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('3. Deve realizar login com sucesso e retornar o Token JWT (200 OK)', async () => {
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testEmail,
                password: 'senha_segura_123',
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');

        // Armazena o token para o próximo teste
        authToken = response.body.data.token;
    });

    it('4. Deve negar o acesso a rota protegida se o token não for fornecido (401 Unauthorized)', async () => {
        const response = await request(app).get('/api/v1/admin/dashboard');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('5. Deve permitir o acesso a rota protegida com Token válido e RLS (200 OK)', async () => {
        const response = await request(app)
            .get('/api/v1/admin/dashboard')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Acesso concedido com RLS ativo');
    });
});