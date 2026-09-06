import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Exporta o tipo nativo de transação do Drizzle
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withTenant<T>(
    tenantId: string,
    fn: (tx: DbTransaction) => Promise<T>
): Promise<T> {
    // A própria transação do Drizzle cuida do BEGIN, COMMIT, ROLLBACK e release da conexão
    return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
        return fn(tx);
    });
}