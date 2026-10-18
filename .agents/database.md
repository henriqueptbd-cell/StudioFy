# Papel: Banco de dados e RLS

Escopo: `backend/src/db/`, `database/` e qualquer migration/consulta que toque o
PostgreSQL.

## Arquivos-chave

- `backend/src/db/schema.ts` — schema Drizzle (fonte de verdade das tabelas).
- `backend/src/db/migrate.ts` — aplicação de migrations e RLS.
- `backend/src/db/client.ts` — pool/conexão da aplicação.
- `backend/src/db/seed.ts` — dados de demonstração.
- `database/rls.sql` — políticas de Row Level Security.
- `database/constraints.sql` — constraints e triggers.
- `docs/DATABASE_MODEL.md` — modelo e máquina de estados.

## Regras de modelagem

- Toda tabela de negócio tem `tenant_id` e índice por ele.
- Chaves estrangeiras de `customer_id`, `service_id` e `professional_id` devem
  pertencer ao mesmo tenant do agendamento.
- Datas em `TIMESTAMPTZ` (UTC). `tenants.timezone` é IANA (`America/Sao_Paulo` padrão).
- `appointments.expires_at` em UTC.
- Status do agendamento segue a máquina de estados documentada; não crie transições
  fora dela.
- Sobreposição de `PENDENTE`/`CONFIRMADO` é impedida no banco (constraint/trigger),
  inclusive sob concorrência.

## RLS

- Habilite RLS nas tabelas de negócio com políticas de `SELECT`, `INSERT`, `UPDATE`
  e `DELETE` filtradas pelo tenant atual.
- A aplicação define `app.current_tenant_id` na **mesma conexão/transação** da
  operação (ver `setTenantContext`).
- A role da API não pode ter `SUPERUSER` nem `BYPASSRLS`.
- `MIGRATION_DATABASE_URL` (role proprietária) é usada só por migrations; a API usa
  `DATABASE_URL`.
- Teste leitura, inserção, atualização e exclusão entre dois tenants.

## Comandos

```bash
npm run db:generate --prefix backend   # gera migration a partir do schema
npm run db:migrate --prefix backend    # aplica migrations
npm run db:rls --prefix backend        # reaplica RLS
npm run db:seed --prefix backend       # popula demonstração
```

## Guarda-corpos

- Nunca rode migration/seed em produção sem confirmação humana.
- Nunca use a role proprietária na API.
- Nunca desabilite RLS para "resolver" um erro; corrija o contexto de tenant.
- Mudança de schema exige atualização de `docs/DATABASE_MODEL.md` e validação de RLS.
