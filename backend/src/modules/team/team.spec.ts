import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../shared/middlewares/errorHandler.js';
import { AuthProvider } from '../../shared/providers/AuthProvider.js';
import { db, withTenant } from '../../db/client.js';
import { tenants, users } from '../../db/schema.js';
import { routes } from '../../routes/index.js';

const app = express();
app.use(express.json());
app.use(routes);
app.use(errorHandler);

describe('Suite de Testes de Integração - Fase 6 (Gestão de Equipe)', () => {
  let tenantSlug = '';
  let tenantId = '';
  let adminId = '';
  let adminToken = '';
  let otherAdminToken = '';
  let professionalId = '';
  let professionalToken = '';
  const professionalEmail = `profissional-${Date.now()}@team.com`;
  const professionalPassword = 'senha_prof_123';

  beforeAll(async () => {
    tenantSlug = `team-test-${Date.now()}`;

    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Studio Team Test', slug: tenantSlug, phone: '11999990000' })
      .returning();

    if (!tenant) {
      throw new Error('Tenant não foi criado');
    }

    tenantId = tenant.id;
    const passwordHash = await AuthProvider.hashPassword('senha_admin_123');

    await withTenant(tenantId, async (tx) => {
      const [admin] = await tx
        .insert(users)
        .values({
          tenantId,
          name: 'Admin Team',
          email: `admin-${Date.now()}@team.com`,
          passwordHash,
          role: 'ADMIN',
        })
        .returning();

      if (!admin) {
        throw new Error('Admin não foi criado');
      }

      adminId = admin.id;
      adminToken = AuthProvider.generateToken({
        sub: admin.id,
        tenantId,
        role: 'ADMIN',
      });
    });

    const [otherTenant] = await db
      .insert(tenants)
      .values({
        name: 'Outro Studio',
        slug: `team-other-${Date.now()}`,
        phone: '11999990001',
      })
      .returning();

    if (!otherTenant) {
      throw new Error('Outro tenant não foi criado');
    }

    await withTenant(otherTenant.id, async (tx) => {
      const [otherAdmin] = await tx
        .insert(users)
        .values({
          tenantId: otherTenant.id,
          name: 'Outro Admin',
          email: `admin-other-${Date.now()}@team.com`,
          passwordHash,
          role: 'ADMIN',
        })
        .returning();

      if (!otherAdmin) {
        throw new Error('Outro admin não foi criado');
      }

      otherAdminToken = AuthProvider.generateToken({
        sub: otherAdmin.id,
        tenantId: otherTenant.id,
        role: 'ADMIN',
      });
    });
  });

  it('1. [ADMIN] Deve cadastrar um profissional (201 Created)', async () => {
    const response = await request(app)
      .post('/api/v1/admin/team')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Profissional Teste',
        email: professionalEmail,
        password: professionalPassword,
        role: 'PROFESSIONAL',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.role).toBe('PROFESSIONAL');
    expect(response.body.data.active).toBe(true);
    expect(response.body.data).not.toHaveProperty('passwordHash');

    professionalId = response.body.data.id;
  });

  it('2. [ADMIN] Deve rejeitar e-mail duplicado no mesmo tenant (409 Conflict)', async () => {
    const response = await request(app)
      .post('/api/v1/admin/team')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Profissional Duplicado',
        email: professionalEmail,
        password: professionalPassword,
        role: 'PROFESSIONAL',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('3. [ADMIN] Deve listar a equipe sem expor passwordHash (200 OK)', async () => {
    const response = await request(app)
      .get('/api/v1/admin/team')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: adminId, role: 'ADMIN' }),
        expect.objectContaining({ id: professionalId, email: professionalEmail }),
      ]),
    );
    expect(
      response.body.data.every((member: { passwordHash?: string }) => !('passwordHash' in member)),
    ).toBe(true);
  });

  it('4. [ADMIN] Não deve listar membros de outro tenant (200 OK)', async () => {
    const response = await request(app)
      .get('/api/v1/admin/team')
      .set('Authorization', `Bearer ${otherAdminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.some((member: { id: string }) => member.id === professionalId)).toBe(
      false,
    );
  });

  it('5. [PROFESSIONAL] Não deve cadastrar membros (403 Forbidden)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      tenantSlug,
      email: professionalEmail,
      password: professionalPassword,
    });

    expect(login.status).toBe(200);
    professionalToken = login.body.data.token;

    const response = await request(app)
      .post('/api/v1/admin/team')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        name: 'Sem Permissão',
        email: `sem-permissao-${Date.now()}@team.com`,
        password: 'senha_123',
        role: 'PROFESSIONAL',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('6. [ADMIN] Deve atualizar nome e senha de um membro (200 OK)', async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/team/${professionalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Profissional Atualizado', password: 'nova_senha_123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Profissional Atualizado');
    expect(response.body.data).not.toHaveProperty('passwordHash');

    const login = await request(app).post('/api/v1/auth/login').send({
      tenantSlug,
      email: professionalEmail,
      password: 'nova_senha_123',
    });

    expect(login.status).toBe(200);
    professionalToken = login.body.data.token;
  });

  it('7. [ADMIN] Não deve desativar o próprio usuário (400 Bad Request)', async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/team/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
  });

  it('8. [ADMIN] Não deve remover o próprio acesso de administrador (400 Bad Request)', async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/team/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'PROFESSIONAL' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CANNOT_DEMOTE_SELF');
  });

  it('9. [ADMIN] Deve desativar um profissional e bloquear novo login (200/403)', async () => {
    const deactivate = await request(app)
      .patch(`/api/v1/admin/team/${professionalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });

    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.active).toBe(false);

    const login = await request(app).post('/api/v1/auth/login').send({
      tenantSlug,
      email: professionalEmail,
      password: 'nova_senha_123',
    });

    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('USER_INACTIVE');
  });

  it('10. [SEGURANÇA] Token de usuário desativado não acessa rotas admin (403)', async () => {
    const reactivate = await request(app)
      .patch(`/api/v1/admin/team/${professionalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });

    expect(reactivate.status).toBe(200);

    const login = await request(app).post('/api/v1/auth/login').send({
      tenantSlug,
      email: professionalEmail,
      password: 'nova_senha_123',
    });

    expect(login.status).toBe(200);
    const activeToken = login.body.data.token;

    const deactivate = await request(app)
      .patch(`/api/v1/admin/team/${professionalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });

    expect(deactivate.status).toBe(200);

    const response = await request(app)
      .get('/api/v1/admin/appointments')
      .set('Authorization', `Bearer ${activeToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('USER_INACTIVE');
  });

  it('11. [ADMIN] Deve rejeitar ID de membro inválido (400 Bad Request)', async () => {
    const response = await request(app)
      .patch('/api/v1/admin/team/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nome Válido' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
