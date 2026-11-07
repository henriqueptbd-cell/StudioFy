export type MigrationUrlSource = 'MIGRATION_DATABASE_URL' | 'DATABASE_URL';

export interface MigrationTarget {
  connectionString: string;
  source: MigrationUrlSource;
  hostname: string;
  databaseName: string;
}

export interface MigrationPrivilegeSnapshot {
  canCreateObjectsInDatabase: boolean;
  canCreateObjectsInPublic: boolean;
  canCreateObjectsInDrizzle: boolean;
  canReadWriteMigrationLedger: boolean;
  nonOwnedTables: string[];
  nonOwnedFunctions: string[];
}

export function resolveMigrationTarget(
  environment: Record<string, string | undefined>,
): MigrationTarget {
  const migrationUrl = environment.MIGRATION_DATABASE_URL?.trim();
  const applicationUrl = environment.DATABASE_URL?.trim();
  const connectionString = migrationUrl || applicationUrl;

  if (!connectionString) {
    throw new Error('Configure MIGRATION_DATABASE_URL ou DATABASE_URL no .env.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new Error('A URL PostgreSQL configurada não está em um formato válido.');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('A URL de banco deve usar o protocolo postgres:// ou postgresql://.');
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('O nome do banco na URL contém codificação inválida.');
  }

  if (!databaseName) {
    throw new Error('A URL PostgreSQL precisa incluir o nome do banco.');
  }

  return {
    connectionString,
    source: migrationUrl ? 'MIGRATION_DATABASE_URL' : 'DATABASE_URL',
    hostname: parsedUrl.hostname,
    databaseName,
  };
}

export function migrationPrivilegeIssues(snapshot: MigrationPrivilegeSnapshot): string[] {
  const issues: string[] = [];
  if (!snapshot.canCreateObjectsInDatabase) {
    issues.push('permissão CREATE no banco (necessária para o schema de migrations)');
  }
  if (!snapshot.canCreateObjectsInPublic) {
    issues.push('permissão CREATE no schema public (necessária para funções de integridade)');
  }
  if (!snapshot.canCreateObjectsInDrizzle) {
    issues.push('permissão CREATE no schema drizzle (necessária para o controle de migrations)');
  }
  if (!snapshot.canReadWriteMigrationLedger) {
    issues.push('permissões SELECT e INSERT na tabela drizzle.__drizzle_migrations');
  }
  if (snapshot.nonOwnedTables.length > 0) {
    issues.push(`ownership de tabelas existentes: ${snapshot.nonOwnedTables.join(', ')}`);
  }
  if (snapshot.nonOwnedFunctions.length > 0) {
    issues.push(`ownership de funções existentes: ${snapshot.nonOwnedFunctions.join(', ')}`);
  }
  return issues;
}
