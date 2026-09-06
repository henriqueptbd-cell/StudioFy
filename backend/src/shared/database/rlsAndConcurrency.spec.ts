import { describe, it, expect, beforeAll } from 'vitest';
import { db, withTenant } from '../../db/client.js';
import { tenants, services, users, customers, appointments } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

describe('Suite de Testes de Banco & Segurança RLS - FASE 2', () => {
    let tenantAId: string;
    let tenantBId: string;

    beforeAll(async () => {
        // 1. Criar dois Tenants distintos para os testes de isolamento de RLS
        const insertedTenantsA = await db
            .insert(tenants)
            .values({
                name: 'Estabelecimento A',
                slug: `tenant-a-${Date.now()}`,
                phone: '11911111111',
            })
            .returning();

        const insertedTenantsB = await db
            .insert(tenants)
            .values({
                name: 'Estabelecimento B',
                slug: `tenant-b-${Date.now()}`,
                phone: '11922222222',
            })
            .returning();

        const tA = insertedTenantsA[0];
        const tB = insertedTenantsB[0];

        if (!tA || !tB) {
            throw new Error('Falha ao criar os tenants de teste no beforeAll.');
        }

        tenantAId = tA.id;
        tenantBId = tB.id;
    });

    it('1. Deve confirmar que a Role do banco não possui SUPERUSER nem BYPASSRLS', async () => {
        const result = await db.execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
            sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
        );

        const currentUserRole = result.rows[0];

        // Type Guard para garantir que o resultado da query não é undefined
        if (!currentUserRole) {
            throw new Error('Não foi possível obter as permissões da Role do usuário atual no PostgreSQL.');
        }

        expect(currentUserRole.rolsuper).toBe(false);
        expect(currentUserRole.rolbypassrls).toBe(false);
    });

    it('2. Deve isolar a leitura de dados entre dois tenants usando contextos RLS diferentes', async () => {
        let serviceAId = '';

        // Inserir um serviço dentro do contexto RLS do Tenant A
        await withTenant(tenantAId, async (tx) => {
            const insertedServices = await tx
                .insert(services)
                .values({
                    tenantId: tenantAId,
                    name: 'Corte de Cabelo Tenant A',
                    durationMinutes: 30,
                    price: '50.00',
                })
                .returning();

            const sA = insertedServices[0];
            if (!sA) throw new Error('Falha ao criar serviço no Tenant A.');

            serviceAId = sA.id;
        });

        // Tentar LER o serviço do Tenant A estando no contexto do Tenant B
        await withTenant(tenantBId, async (tx) => {
            const result = await tx.select().from(services).where(eq(services.id, serviceAId));

            // O RLS deve interceptar e retornar um array vazio
            expect(result.length).toBe(0);
        });
    });

    it('3. Deve impedir alteração e exclusão de dados pertencentes a outro tenant', async () => {
        let serviceAId = '';

        // Criar registro no Tenant A
        await withTenant(tenantAId, async (tx) => {
            const insertedServices = await tx
                .insert(services)
                .values({
                    tenantId: tenantAId,
                    name: 'Barba Tenant A',
                    durationMinutes: 20,
                    price: '30.00',
                })
                .returning();

            const sA = insertedServices[0];
            if (!sA) throw new Error('Falha ao criar serviço no Tenant A.');

            serviceAId = sA.id;
        });

        // Tentar ALTERAR o registro do Tenant A no contexto do Tenant B
        await withTenant(tenantBId, async (tx) => {
            const updated = await tx
                .update(services)
                .set({ name: 'Hackeado por Tenant B' })
                .where(eq(services.id, serviceAId))
                .returning();

            expect(updated.length).toBe(0);
        });

        // Tentar EXCLUIR o registro do Tenant A no contexto do Tenant B
        await withTenant(tenantBId, async (tx) => {
            const deleted = await tx
                .delete(services)
                .where(eq(services.id, serviceAId))
                .returning();

            expect(deleted.length).toBe(0);
        });
    });

    it('4. Deve tratar concorrência impedindo dois agendamentos idênticos no mesmo slot', async () => {
        const slotStartTime = new Date('2026-10-10T14:00:00Z');
        const slotEndTime = new Date('2026-10-10T14:30:00Z');

        let serviceId = '';
        let customerId = '';

        // 1. Criar os registros vinculados de Serviço e Cliente que o schema exige
        await withTenant(tenantAId, async (tx) => {
            const [s] = await tx
                .insert(services)
                .values({
                    tenantId: tenantAId,
                    name: 'Corte Concorrente',
                    durationMinutes: 30,
                    price: '50.00',
                })
                .returning();

            const [c] = await tx
                .insert(customers)
                .values({
                    tenantId: tenantAId,
                    name: 'Cliente Concorrente',
                    phone: `119${Date.now().toString().slice(-8)}`,
                })
                .returning();

            if (!s || !c) {
                throw new Error('Falha ao preparar massa de dados para o teste de concorrência.');
            }

            serviceId = s.id;
            customerId = c.id;
        });

        // 2. Função de criação do agendamento
        const createAppointment = () =>
            withTenant(tenantAId, async (tx) => {
                return tx.insert(appointments).values({
                    tenantId: tenantAId,
                    customerId: customerId,
                    serviceId: serviceId,
                    startTime: slotStartTime,
                    endTime: slotEndTime,
                    status: 'PENDENTE',
                });
            });

        // 3. Executar as duas inserções exatamente no mesmo milissegundo via Promise.allSettled
        const results = await Promise.allSettled([createAppointment(), createAppointment()]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        // Uma operação deve ter sucesso e a concorrente deve falhar ou ser rejeitada
        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);
    });
});