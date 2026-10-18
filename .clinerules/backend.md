---
paths:
  - 'backend/**'
---

# Backend — StudioFy

Siga `.agents/backend.md`, `docs/ARCHITECTURE.md` e `docs/API_SPECIFICATION.md`.

- Camadas: `routes` → `controllers/useCases` → domínio → `db`/repositórios.
- Valide payloads com Zod; erros de negócio via `AppError`.
- Autenticação: `ensureAuthenticated`, `authorizeRole`, `setTenantContext`.
- Nunca confie em `tenant_id` do cliente.
- Datas em UTC no banco; converta pelo timezone IANA do tenant na borda.
- Senhas só com hash bcrypt; nunca logue senha ou token.
- Antes de concluir: `npm run typecheck --prefix backend`,
  `npm run lint --prefix backend` e `npm run test --prefix backend`.
