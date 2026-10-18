# Papel: Testes e qualidade

Escopo: testes automatizados, typecheck e lint de todo o repositório.

## Ferramentas

- **Vitest** — executor e assertions (`backend`).
- **Supertest** — requisições HTTP contra o Express em memória.
- **TypeScript** — `tsc --noEmit` (typecheck).
- **ESLint** — padrão e qualidade.
- **Prettier** — formatação.

O Vitest executa somente `src/**/*.spec.ts` e ignora `dist/`.

## Comandos

```bash
npm test                              # typecheck backend + frontend
npm run lint
npm run test --prefix backend         # Vitest
npm run test --prefix backend -- src/modules/appointments/useCases/phase4Step3.spec.ts
```

## Suítes conhecidas

- `backend/src/shared/utils/timezone.spec.ts` — conversão local/UTC por timezone IANA.
- `backend/src/shared/database/rlsAndConcurrency.spec.ts` — RLS e concorrência.
- `backend/src/modules/appointments/useCases/phase4Step1And2.spec.ts` — API pública.
- `backend/src/modules/appointments/useCases/phase4Step3.spec.ts` — criação/transições.
- `backend/src/db/isolation-test.ts` — verificação de isolamento entre tenants.
- `backend/src/modules/auth/useCases/login/loginAndProvision.spec.ts` — login e
  provisionamento (conforme `docs/TESTING.md`).

Consulte `docs/TESTING.md` para o estado atual da suíte.

## Regras para novos testes

- Verifique comportamento observável, não detalhes internos desnecessários.
- Isole ou limpe os dados criados; testes não podem depender de ordem de execução.
- Nunca use credenciais, tokens ou dados reais em fixtures/logs.
- Testes que dependem de PostgreSQL devem declarar o ambiente necessário.
- Migrations em teste usam `MIGRATION_DATABASE_URL` (role proprietária), nunca a role
  restrita da API.
- Cubra sucesso, validação, autorização e erro.
- Para agendamentos, cubra conflito, concorrência, expiração e transições inválidas.

## Antes de concluir

- `npm test` e `npm run lint` passando.
- Se o comportamento mudou, o teste mudou junto.
- Relate no resumo quais comandos foram executados e o resultado.
