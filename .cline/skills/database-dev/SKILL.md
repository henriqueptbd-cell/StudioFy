---
name: database-dev
description: Trabalha com schema Drizzle, migrations, constraints e Row Level Security do StudioFy. Use ao alterar tabelas, índices, políticas RLS, seeds ou ao investigar isolamento entre tenants e concorrência de agendamentos.
---

# Banco de dados e RLS

Leia `.agents/database.md` e `docs/DATABASE_MODEL.md` antes de editar.

## Procedimento

1. Alterações de schema começam em `backend/src/db/schema.ts`.
2. Gere a migration com `npm run db:generate --prefix backend` e revise o SQL.
3. Garanta `tenant_id`, índices e RLS em tabelas de negócio.
4. A aplicação define `app.current_tenant_id` na mesma conexão/transação.
5. A role da API não pode ter `SUPERUSER` nem `BYPASSRLS`.
6. Use `MIGRATION_DATABASE_URL` apenas para migrations.
7. Datas em `TIMESTAMPTZ` (UTC); `tenants.timezone` em IANA.
8. Preserve a constraint/trigger que impede sobreposição de `PENDENTE`/`CONFIRMADO`.

## Validação

```bash
npm run db:migrate --prefix backend
npm run test --prefix backend
```

## Limites

- Não rode migration/seed em produção sem confirmação humana.
- Não desabilite RLS para contornar erro.
- Mudança de schema exige atualização de `docs/DATABASE_MODEL.md`.

Ao concluir, registre a tarefa em `docs/WORKLOG.md` (sem apagar entradas anteriores).
