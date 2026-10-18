# Papel: Backend

Escopo: `backend/`. API REST em Node.js + Express 4 + TypeScript (ESM) + Zod +
Drizzle ORM + PostgreSQL.

## Estrutura atual

```text
backend/src/
├── config/env.ts                  # validação das variáveis de ambiente
├── db/
│   ├── client.ts                  # pool/conexão PostgreSQL
│   ├── schema.ts                  # schema Drizzle
│   ├── migrate.ts                 # aplicação de migrations/RLS
│   └── seed.ts                    # dados de demonstração
├── modules/<contexto>/useCases/   # controllers/casos de uso
├── routes/                        # auth, public, admin, index
├── shared/
│   ├── database/                  # testes de RLS/concorrência
│   ├── errors/AppError.ts
│   ├── middlewares/               # auth, role, tenant, erro, rate limit
│   ├── providers/AuthProvider.ts  # hash de senha / token
│   └── utils/                     # timezone
└── server.ts
```

## Convenções

- Siga a direção de dependência: `routes` → `controllers/useCases` → domínio →
  `db`/repositórios. Não coloque regra de negócio em `routes`.
- Valide entrada com **Zod** antes de chamar o caso de uso.
- Erros de negócio usam `AppError`; o `errorHandler` converte para o formato padrão.
- Respostas: `{ success: true, data }` ou
  `{ success: false, error: { code, message } }`.
- Autenticação: `ensureAuthenticated` valida o JWT; `authorizeRole` aplica o papel;
  `setTenantContext` define `app.current_tenant_id` na conexão/transação.
- Nunca confie em `tenant_id` do cliente. Use o tenant do JWT ou o `slug` público.
- Datas: receba/entregue no timezone do tenant, persista em UTC. Use
  `shared/utils/timezone.ts` (`date-fns-tz`), nunca o fuso do processo.
- Senhas: somente hash com bcrypt (`AuthProvider`). Nunca logue senha ou token.
- `type: module` (ESM): use `import`/`export`, não `require`.

## Comandos

```bash
npm run dev --prefix backend
npm run test --prefix backend
npm run typecheck --prefix backend
npm run lint --prefix backend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
```

## Antes de concluir

- Rode `typecheck` + `lint` + testes do backend.
- Crie/atualize teste em `src/**/*.spec.ts` para comportamento novo.
- Se o contrato HTTP mudou, atualize `docs/API_SPECIFICATION.md`.
- Não altere schema/migration sem confirmação humana.
