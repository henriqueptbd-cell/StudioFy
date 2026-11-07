import { describe, expect, it } from 'vitest';
import {
  migrationPrivilegeIssues,
  resolveMigrationTarget,
  type MigrationPrivilegeSnapshot,
} from './migrationSafety.js';

const allPrivileges: MigrationPrivilegeSnapshot = {
  canCreateObjectsInDatabase: true,
  canCreateObjectsInPublic: true,
  canCreateObjectsInDrizzle: true,
  canReadWriteMigrationLedger: true,
  nonOwnedTables: [],
  nonOwnedFunctions: [],
};

describe('migration safety helpers', () => {
  it('prefers a dedicated migration URL and extracts only its target metadata', () => {
    const target = resolveMigrationTarget({
      DATABASE_URL: 'postgresql://app:app-secret@runtime.example/studiofy',
      MIGRATION_DATABASE_URL: 'postgresql://owner:owner-secret@db.example/studiofy_prod',
    });

    expect(target.source).toBe('MIGRATION_DATABASE_URL');
    expect(target.hostname).toBe('db.example');
    expect(target.databaseName).toBe('studiofy_prod');
  });

  it('falls back to DATABASE_URL but marks that it is not a migration credential', () => {
    const target = resolveMigrationTarget({
      DATABASE_URL: 'postgres://app:secret@localhost:5432/studiofy_e2e',
    });

    expect(target.source).toBe('DATABASE_URL');
    expect(target.hostname).toBe('localhost');
    expect(target.databaseName).toBe('studiofy_e2e');
  });

  it('rejects missing, malformed and non-PostgreSQL URLs without echoing credentials', () => {
    expect(() => resolveMigrationTarget({})).toThrow('Configure MIGRATION_DATABASE_URL');
    expect(() => resolveMigrationTarget({ DATABASE_URL: 'not-a-url' })).toThrow(
      'não está em um formato válido',
    );
    expect(() =>
      resolveMigrationTarget({ DATABASE_URL: 'https://user:secret@example/db' }),
    ).toThrow('protocolo postgres://');
  });

  it('accepts a complete migration permission preflight', () => {
    expect(migrationPrivilegeIssues(allPrivileges)).toEqual([]);
  });

  it('reports missing DDL, ownership and ledger privileges before migrations run', () => {
    const issues = migrationPrivilegeIssues({
      ...allPrivileges,
      canCreateObjectsInDatabase: false,
      canCreateObjectsInDrizzle: false,
      canCreateObjectsInPublic: false,
      canReadWriteMigrationLedger: false,
      nonOwnedTables: ['appointments', 'tenants'],
      nonOwnedFunctions: ['check_appointment_conflict'],
    });

    expect(issues).toEqual([
      'permissão CREATE no banco (necessária para o schema de migrations)',
      'permissão CREATE no schema public (necessária para funções de integridade)',
      'permissão CREATE no schema drizzle (necessária para o controle de migrations)',
      'permissões SELECT e INSERT na tabela drizzle.__drizzle_migrations',
      'ownership de tabelas existentes: appointments, tenants',
      'ownership de funções existentes: check_appointment_conflict',
    ]);
  });
});
