import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(__dirname, '../../../database');
const { Pool } = pg;
const migrationPool = new Pool({ connectionString: env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL });
const migrationDb = drizzle(migrationPool);

await migrate(migrationDb, { migrationsFolder: './drizzle' });

const rlsSql = readFileSync(resolve(databaseDir, 'rls.sql'), 'utf8');
const constraintsSql = readFileSync(resolve(databaseDir, 'constraints.sql'), 'utf8');

await migrationDb.execute(rlsSql);
await migrationDb.execute(constraintsSql);

await migrationPool.end();
