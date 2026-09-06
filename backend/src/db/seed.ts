import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import { scheduleConfigs, services, tenants, users } from './schema.js';

const [tenant] = await db
    .insert(tenants)
    .values({
        name: 'StudioFy Demo',
        slug: 'studiofy-demo',
        phone: '5511999999999',
        timezone: 'America/Sao_Paulo',
        primaryColor: '#111827',
    })
    .onConflictDoNothing({ target: tenants.slug })
    .returning();

const [existingTenant] = tenant
    ? [tenant]
    : await db.select().from(tenants).where(eq(tenants.slug, 'studiofy-demo')).limit(1);

if (!existingTenant) {
    throw new Error('Nao foi possivel criar ou localizar o tenant de seed.');
}

await db.insert(users).values({
    tenantId: existingTenant.id,
    name: 'Administrador Demo',
    email: 'admin@studiofy.local',
    passwordHash: 'REPLACE_WITH_HASH_IN_AUTH_SETUP',
    role: 'ADMIN',
});

await db.insert(services).values([
    {
        tenantId: existingTenant.id,
        name: 'Corte masculino',
        description: 'Corte tradicional.',
        durationMinutes: 30,
        price: '35.00',
    },
    {
        tenantId: existingTenant.id,
        name: 'Manicure',
        description: 'Manicure tradicional.',
        durationMinutes: 45,
        price: '45.00',
    },
]);

await db.insert(scheduleConfigs).values(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
        tenantId: existingTenant.id,
        dayOfWeek,
        openTime: '08:00',
        closeTime: '18:00',
        isClosed: dayOfWeek === 0,
    })),
);

console.log('Seed concluido para o tenant studiofy-demo.');
await pool.end();