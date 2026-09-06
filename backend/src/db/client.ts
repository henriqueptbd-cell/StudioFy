import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool);

export async function withTenant<T>(
    tenantId: string,
    fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}