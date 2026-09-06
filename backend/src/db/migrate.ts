import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(__dirname, '../../../database');

await migrate(db, { migrationsFolder: './drizzle' });

const rlsSql = readFileSync(resolve(databaseDir, 'rls.sql'), 'utf8');
const constraintsSql = readFileSync(resolve(databaseDir, 'constraints.sql'), 'utf8');

await db.execute(rlsSql);
await db.execute(constraintsSql);

await pool.end();
