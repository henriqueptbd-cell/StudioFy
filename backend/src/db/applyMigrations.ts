import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import {
  migrationPrivilegeIssues,
  resolveMigrationTarget,
  type MigrationPrivilegeSnapshot,
} from './migrationSafety.js';

const { Client } = pg;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(scriptDirectory, '../..');
const repositoryDirectory = resolve(backendDirectory, '..');
const requiredTables = [
  'appointments',
  'customers',
  'platform_admins',
  'platform_audit_logs',
  'schedule_configs',
  'services',
  'tenants',
  'users',
];
const requiredFunctions = ['check_appointment_conflict', 'prevent_platform_audit_mutation'];

interface LoadedEnvironment {
  values: Record<string, string | undefined>;
  files: string[];
}

interface DatabasePreflight {
  databaseName: string;
  roleName: string;
  snapshot: MigrationPrivilegeSnapshot;
}

function loadEnvironment(): LoadedEnvironment {
  const valuesFromFiles: Record<string, string> = {};
  const files: string[] = [];
  const candidates = [resolve(backendDirectory, '.env'), resolve(repositoryDirectory, '.env')];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const parsed = dotenv.parse(readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in valuesFromFiles)) valuesFromFiles[key] = value;
    }
    files.push(relative(repositoryDirectory, filePath) || '.env');
  }

  return {
    values: { ...valuesFromFiles, ...process.env },
    files,
  };
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

async function inspectPrivileges(connectionString: string): Promise<DatabasePreflight> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 12_000 });
  try {
    await client.connect();
  } catch (error) {
    const code = errorCode(error);
    throw new Error(
      `Conexão de verificação recusada${code ? ` (código ${code})` : ''}. Nenhuma migration foi iniciada. Confira host, usuário, senha, SSL e allowlist no provedor.`,
    );
  }

  try {
    const baseResult = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS role_name,
        has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_objects_in_database,
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle')
            THEN has_schema_privilege(current_user, 'drizzle', 'CREATE')
          ELSE has_database_privilege(current_user, current_database(), 'CREATE')
        END AS can_create_objects_in_drizzle,
        has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_objects_in_public,
        CASE
          WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN true
          ELSE has_schema_privilege(current_user, 'drizzle', 'USAGE')
            AND has_table_privilege(current_user, 'drizzle.__drizzle_migrations', 'SELECT,INSERT')
        END AS can_read_write_migration_ledger
    `);
    const base = baseResult.rows[0] as
      | {
          database_name: string;
          role_name: string;
          can_create_objects_in_database: boolean;
          can_create_objects_in_drizzle: boolean;
          can_create_objects_in_public: boolean;
          can_read_write_migration_ledger: boolean;
        }
      | undefined;
    if (!base) throw new Error('O preflight não retornou metadados do banco.');

    const tableResult = await client.query(
      `
        SELECT c.relname AS object_name,
          pg_has_role(current_user, c.relowner, 'USAGE') AS can_alter
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname
      `,
      [requiredTables],
    );
    const tableRows = tableResult.rows as Array<{ object_name: string; can_alter: boolean }>;

    const functionResult = await client.query(
      `
        SELECT p.proname AS object_name,
          pg_has_role(current_user, p.proowner, 'USAGE') AS can_replace
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY($1::text[])
        ORDER BY p.proname
      `,
      [requiredFunctions],
    );
    const functionRows = functionResult.rows as Array<{
      object_name: string;
      can_replace: boolean;
    }>;

    return {
      databaseName: base.database_name,
      roleName: base.role_name,
      snapshot: {
        canCreateObjectsInDatabase: base.can_create_objects_in_database,
        canCreateObjectsInPublic: base.can_create_objects_in_public,
        canCreateObjectsInDrizzle: base.can_create_objects_in_drizzle,
        canReadWriteMigrationLedger: base.can_read_write_migration_ledger,
        nonOwnedTables: tableRows.filter((row) => !row.can_alter).map((row) => row.object_name),
        nonOwnedFunctions: functionRows
          .filter((row) => !row.can_replace)
          .map((row) => row.object_name),
      },
    };
  } catch (error) {
    const code = errorCode(error);
    throw new Error(
      `Não foi possível verificar as permissões do banco${code ? ` (código ${code})` : ''}. Nenhuma migration foi iniciada.`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

function printTarget(
  target: ReturnType<typeof resolveMigrationTarget>,
  environmentFiles: string[],
): void {
  console.log('\nDestino configurado:');
  console.log(`  host: ${target.hostname}`);
  console.log(`  banco: ${target.databaseName}`);
  console.log(`  fonte da credencial: ${target.source}`);
  console.log(
    `  .env: ${environmentFiles.length > 0 ? environmentFiles.join(', ') : 'nenhum; usando variáveis do processo'}`,
  );
  if (target.source === 'DATABASE_URL') {
    console.warn(
      '\nAviso: MIGRATION_DATABASE_URL não está definida. DATABASE_URL será usada apenas para o preflight até que as permissões sejam verificadas; ela pode ser a role restrita da aplicação.',
    );
  }
}

function printPreflight(result: DatabasePreflight): string[] {
  console.log(`\nConectado ao banco ${result.databaseName} com a role ${result.roleName}.`);
  const issues = migrationPrivilegeIssues(result.snapshot);
  if (issues.length === 0) {
    console.log('Preflight de privilégios: aprovado.');
    return issues;
  }

  console.error('Preflight reprovado; nenhum comando de migration foi iniciado:');
  for (const issue of issues) console.error(`  - ${issue}`);
  console.error(
    '\nConfigure uma MIGRATION_DATABASE_URL com ownership/permissões adequadas. Não conceda BYPASSRLS à role normal da API.',
  );
  return issues;
}

async function askForExactText(prompt: string, expected: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Este comando exige um terminal interativo para confirmar o banco de destino.');
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await readline.question(prompt)).trim() === expected;
  } finally {
    readline.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const allowedArgs = new Set(['--dry-run', '--check-only']);
  const unexpectedArgs = args.filter((arg) => !allowedArgs.has(arg));
  if (unexpectedArgs.length > 0 || (args.includes('--dry-run') && args.includes('--check-only'))) {
    throw new Error('Uso: npm run db:apply:checked [-- --dry-run | --check-only]');
  }

  const { values, files } = loadEnvironment();
  const target = resolveMigrationTarget(values);
  printTarget(target, files);

  if (args.includes('--dry-run')) {
    console.log('\nDry run concluído: nenhuma conexão ou alteração no banco foi feita.');
    return;
  }

  if (!args.includes('--check-only')) {
    const targetLabel = `${target.hostname}/${target.databaseName}`;
    const acceptedTarget = await askForExactText(
      `\nDigite host/banco (${targetLabel}) para iniciar somente a checagem de permissões: `,
      targetLabel,
    );
    if (!acceptedTarget) {
      console.log('Cancelado. Nenhuma conexão de preflight ou migration foi iniciada.');
      process.exitCode = 1;
      return;
    }
  }

  const preflight = await inspectPrivileges(target.connectionString);
  if (preflight.databaseName !== target.databaseName) {
    throw new Error(
      `A URL aponta para ${target.databaseName}, mas o servidor conectou a ${preflight.databaseName}. Nenhuma migration foi iniciada.`,
    );
  }
  const issues = printPreflight(preflight);
  if (issues.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (args.includes('--check-only')) {
    console.log('\nChecagem concluída. Nenhuma migration, RLS ou constraint foi alterada.');
    return;
  }

  if (target.source === 'DATABASE_URL') {
    const acceptedFallback = await askForExactText(
      '\nA URL verificada é DATABASE_URL, não uma credencial exclusiva de migration. Digite USAR DATABASE_URL para aceitar conscientemente esse uso pontual: ',
      'USAR DATABASE_URL',
    );
    if (!acceptedFallback) {
      console.log('Cancelado. Nenhuma migration foi iniciada.');
      process.exitCode = 1;
      return;
    }
  }

  const applyPhrase = `APLICAR ${target.hostname}/${target.databaseName}`;
  const acceptedApply = await askForExactText(
    `\nSerão aplicadas as migrations versionadas pendentes e reaplicados RLS/constraints. Digite "${applyPhrase}" para continuar: `,
    applyPhrase,
  );
  if (!acceptedApply) {
    console.log('Cancelado. Nenhuma migration foi iniciada.');
    process.exitCode = 1;
    return;
  }

  console.log('\nIniciando o runner existente db:rls; nenhuma migration nova será gerada.');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawnSync(npmCommand, ['run', 'db:rls'], {
    cwd: backendDirectory,
    env: { ...values, MIGRATION_DATABASE_URL: target.connectionString },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (child.error) {
    console.error('Não foi possível iniciar o runner de migrations.');
    process.exitCode = 1;
    return;
  }
  if (child.status !== 0) {
    console.error(
      '\nO runner terminou com erro. Antes de tentar novamente, confira o histórico drizzle.__drizzle_migrations; alguma migration anterior pode ter sido aplicada.',
    );
    process.exitCode = child.status ?? 1;
    return;
  }

  console.log('\nMigrations pendentes e scripts de RLS/constraints concluídos.');
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Falha inesperada no helper de migration.',
  );
  process.exitCode = 1;
});
