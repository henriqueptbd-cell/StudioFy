---
paths:
  - 'database/**'
  - 'backend/src/db/**'
---

# Banco de dados e RLS — StudioFy

Siga `.agents/database.md` e `docs/DATABASE_MODEL.md`.

- Toda tabela de negócio tem `tenant_id`; mantenha RLS em `SELECT/INSERT/UPDATE/DELETE`.
- A aplicação define `app.current_tenant_id` na mesma conexão/transação.
- Role da API sem `SUPERUSER` e sem `BYPASSRLS`.
- `MIGRATION_DATABASE_URL` só para migrations.
- Datas em `TIMESTAMPTZ` (UTC); `tenants.timezone` em IANA.
- Sobreposição de `PENDENTE`/`CONFIRMADO` é impedida no banco, inclusive sob concorrência.
- Nunca desabilite RLS para contornar erro; corrija o contexto de tenant.
- Mudança de schema exige confirmação humana e atualização da documentação.
