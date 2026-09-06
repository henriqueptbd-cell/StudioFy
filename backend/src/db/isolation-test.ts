import { db, pool } from './client.js';
import { tenants, users, services } from './schema.js';
import { eq } from 'drizzle-orm';

async function testIsolation() {
  // Criar 2 tenants e garantir o retorno dos IDs
  const insertedT1 = await db.insert(tenants).values({ name: 'T1', slug: 't1', phone: '1' }).returning();
  const insertedT2 = await db.insert(tenants).values({ name: 'T2', slug: 't2', phone: '2' }).returning();

  const t1 = insertedT1[0];
  const t2 = insertedT2[0];

  // Checagem de segurança caso a inserção falhe
  if (!t1 || !t2) {
    throw new Error('Falha ao inserir tenants: t1 ou t2 retornou undefined.');
  }

  await db.insert(users).values([
    { tenantId: t1.id, name: 'U1', email: 'u1@t1', passwordHash: 'x', role: 'ADMIN' },
    { tenantId: t2.id, name: 'U2', email: 'u2@t2', passwordHash: 'x', role: 'ADMIN' },
  ]);

  const usersT1 = await db.select().from(users).where(eq(users.tenantId, t1.id));
  const usersT2 = await db.select().from(users).where(eq(users.tenantId, t2.id));

  console.log('Isolation test:', usersT1.length === 1 && usersT2.length === 1 ? 'PASS' : 'FAIL');

  await pool.end();
}

testIsolation()
  .catch((err) => console.error('Isolation test error:', err))
  .finally(() => process.exit());