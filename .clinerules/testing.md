---
paths:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - '**/*.spec.tsx'
  - '**/*.test.tsx'
---

# Testes — StudioFy

Siga `.agents/testing.md` e `docs/TESTING.md`.

- Verifique comportamento observável; isole/limpe os dados criados.
- Nunca use credenciais, tokens ou dados reais.
- Cubra sucesso, validação, autorização e erro.
- Para agendamentos: conflito, concorrência, expiração e transições inválidas.
- Testes com PostgreSQL declaram o ambiente necessário; migrations usam
  `MIGRATION_DATABASE_URL`.
- Execute `npm run test --prefix backend` e `npm run lint` antes de concluir.
