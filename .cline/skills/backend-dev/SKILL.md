---
name: backend-dev
description: Implementa e revisa código no backend do StudioFy (Express, TypeScript, Zod, Drizzle, JWT, RLS). Use ao criar/alterar rotas, casos de uso, middlewares, autenticação, agendamentos ou integração com o banco na pasta backend/.
---

# Backend

Leia `.agents/backend.md` e `docs/ARCHITECTURE.md` antes de editar.

## Procedimento

1. Localize a rota/caso de uso existente mais próximo e siga o mesmo padrão.
2. Valide payloads com Zod; use `AppError` para erros de negócio.
3. Respeite as camadas: `routes` → `controllers/useCases` → domínio → `db`.
4. Garanta o contexto de tenant (`setTenantContext`) em toda operação de negócio.
5. Converta datas pelo timezone IANA do tenant; persista em UTC.
6. Não logue senha, token ou dados sensíveis.

## Validação

```bash
npm run typecheck --prefix backend
npm run lint --prefix backend
npm run test --prefix backend
```

Se o contrato HTTP mudou, atualize `docs/API_SPECIFICATION.md`.

Ao concluir, registre a tarefa em `docs/WORKLOG.md` (sem apagar entradas anteriores).
