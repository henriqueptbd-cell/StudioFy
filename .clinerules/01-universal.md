# Regras universais — StudioFy

Estas regras valem para qualquer tarefa, em qualquer área do repositório.

## Segurança

- Nunca leia, grave ou exponha `.env` real, segredos, tokens ou dados de clientes.
- A API usa `DATABASE_URL` (role restrita, sem `SUPERUSER`/`BYPASSRLS`).
  `MIGRATION_DATABASE_URL` é exclusiva de migrations.
- Nunca aceite `tenant_id` arbitrário vindo do cliente.
- Migrations, deploy, rotação de segredos e exclusão de dados exigem confirmação
  humana explícita.

## Qualidade

- Valide entrada com Zod e responda em `{ success, data }` ou
  `{ success: false, error: { code, message } }`.
- Antes de concluir, rode `npm test` e `npm run lint`.
- Só marque `[x]` no `docs/ROADMAP.md` com evidência (código + validação).
- Toda tarefa termina com uma entrada em `docs/WORKLOG.md` (pedido, decisão, mudanças,
  validação e pendências). Entradas são append-only; nunca apague as anteriores.
- Se documentação e código divergirem, reporte antes de implementar.

## Git

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Não faça `commit` ou `push` sem pedido explícito.

## Contexto

- Comece pelo `AGENTS.md` e pelo `docs/ROADMAP.md`.
- Consulte `docs/WORKLOG.md` para saber o que já foi pedido e decidido.
- O papel detalhado da área está em `.agents/<área>.md`.
