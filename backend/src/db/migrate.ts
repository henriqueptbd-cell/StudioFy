import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(__dirname, '../../../database');
const { Pool } = pg;
const migrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) {
  throw new Error('Configure MIGRATION_DATABASE_URL ou DATABASE_URL para executar migrations.');
}
const migrationPool = new Pool({ connectionString: migrationUrl });
const migrationDb = drizzle(migrationPool);

try {
  await migrate(migrationDb, { migrationsFolder: './drizzle' });

  const rlsSql = readFileSync(resolve(databaseDir, 'rls.sql'), 'utf8');
  const constraintsSql = readFileSync(resolve(databaseDir, 'constraints.sql'), 'utf8');

  await migrationDb.execute(rlsSql);
  await migrationDb.execute(constraintsSql);
} finally {
  await migrationPool.end();
}
