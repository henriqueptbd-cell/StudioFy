# AGENTS.md — StudioFy

> Instruções persistentes para agentes de IA (Cline, Cursor, Codex, Claude Code etc.).
> Padrão portátil: <https://agents.md/>. Este arquivo é a "constituição" do projeto;
> os papéis detalhados ficam em `.agents/*.md`.

## 1. O que é este projeto

StudioFy é um SaaS **multi-tenant** de agendamento e gestão para barbearias, salões de
beleza e clínicas de estética. O cliente final agenda **sem conta** (apenas nome e
telefone); administradores e profissionais usam o painel autenticado.

Stack real do repositório:

- `backend/` — Node.js + Express 4 + TypeScript (ESM) + Zod + Drizzle ORM + PostgreSQL
  (Neon) + JWT + bcryptjs + Vitest/Supertest.
- `frontend/` — React 19 + TypeScript + Vite 6 + Tailwind CSS 3 + TanStack Query 5 +
  React Router 7 + Axios + react-hot-toast + lucide-react.
- `database/` — SQL de constraints e Row Level Security.
- `docs/` — arquitetura, contratos, segurança, testes, roadmap e visão de produto.

## 2. Fontes de verdade (leia antes de agir)

| Tema                                 | Arquivo                         |
| ------------------------------------ | ------------------------------- |
| O que fazer e em que ordem           | `docs/ROADMAP.md`               |
| Camadas e padrões do backend         | `docs/ARCHITECTURE.md`          |
| Padrões do frontend                  | `docs/FRONTEND_ARCHITECTURE.md` |
| Modelo de dados e máquina de estados | `docs/DATABASE_MODEL.md`        |
| Contratos HTTP                       | `docs/API_SPECIFICATION.md`     |
| LGPD, RLS, JWT e autorização         | `docs/SECURITY_AND_PRIVACY.md`  |
| Como testar                          | `docs/TESTING.md`               |
| Escopo e regras de negócio           | `docs/visao_do_produto.md`      |
| Histórico de pedidos e decisões      | `docs/WORKLOG.md`               |

Se documentação e código divergirem, **pare e reporte a divergência** antes de
implementar. Checkboxes do roadmap podem estar desatualizados: confirme no código.

## 3. Comandos oficiais

Na raiz:

```bash
npm run dev          # backend (3333) + frontend (5173) em paralelo
npm run build        # build de backend e frontend
npm test             # typecheck de backend e frontend
npm run lint         # ESLint de backend e frontend
npm run format       # Prettier
npm run db:migrate   # gera e aplica migrations
npm run db:seed      # popula dados de demonstração
```

No backend (`--prefix backend`): `test`, `typecheck`, `lint`, `db:generate`,
`db:migrate`, `db:seed`, `db:rls`. No frontend: `typecheck`, `lint`, `build`, `preview`.

## 4. Regras inegociáveis

- Nunca leia, grave ou exponha `.env` real, segredos, tokens ou dados reais de clientes.
  Documente variáveis apenas em `.env.example`.
- `MIGRATION_DATABASE_URL` usa a role proprietária e serve **somente** para migrations.
  A API usa `DATABASE_URL` com role restrita, **sem** `SUPERUSER` e **sem** `BYPASSRLS`.
- Toda consulta de negócio deve rodar com o contexto de tenant
  (`app.current_tenant_id`) estabelecido na mesma conexão/transação.
- Nunca aceite `tenant_id` arbitrário vindo de body, query ou header do cliente.
- Valide todo payload com **Zod** e responda no formato padrão
  `{ success, data }` ou `{ success: false, error: { code, message } }`.
- Datas são armazenadas em UTC (`TIMESTAMPTZ`) e convertidas pelo timezone IANA do
  tenant na borda da API.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Não faça `commit`, `push`, deploy ou exclusão de dados sem pedido explícito.

## 5. Fluxo de trabalho

1. Leia o `docs/ROADMAP.md` e identifique a próxima fatia pendente, respeitando
   dependências entre fases.
2. Confirme no código se o item está realmente pendente.
3. Delegue ao papel da área (`.agents/<área>.md`) e mantenha o escopo pequeno.
4. Implemente e valide com `typecheck` + `lint` + testes relevantes.
5. Marque `[x]` no roadmap **somente com evidência** (código + validação).
6. Registre a tarefa em `docs/WORKLOG.md` (pedido, decisão, mudanças, validação e
   pendências) e resuma o resultado ao usuário.

## 6. Papéis

| Papel                            | Arquivo                   |
| -------------------------------- | ------------------------- |
| Orquestrador (coordena e delega) | `.agents/orchestrator.md` |
| Backend                          | `.agents/backend.md`      |
| Frontend                         | `.agents/frontend.md`     |
| Banco de dados / RLS             | `.agents/database.md`     |
| Testes                           | `.agents/testing.md`      |
| Documentação                     | `.agents/docs.md`         |
| Auditoria cruzada                | `.agents/auditor.md`      |

### Orquestração no OpenClaw

Em sessões do OpenClaw, o agente principal (`main`) assume o papel de
**orquestrador** descrito em `.agents/orchestrator.md`: planeja a fatia, delega por
área (usando subagentes/ferramentas nativas do OpenClaw no lugar das skills do Cline),
integra, valida e registra no `docs/WORKLOG.md`. O trabalho usa **múltiplos agentes em
paralelo** quando as tarefas são independentes e exige **auditoria cruzada** por um
agente diferente do implementador (`.agents/auditor.md`). A precedência documentada em
`.agents/README.md` continua valendo; o que muda é apenas o executor.

## 7. Limites de autonomia

**Pode decidir sozinho:** organização interna de arquivos, nomes locais, refactors
pequenos, detalhes de implementação dentro das convenções e uso de bibliotecas já
presentes no projeto.

**Deve pedir confirmação humana:** migrations e mudanças de schema, deploy, rotação de
segredos, exclusão de dados, alteração de regra de negócio, quebra de contrato público
da API, `commit`/`push` e qualquer ação em produção.

## 8. Registro obrigatório (WORKLOG)

Toda tarefa — inclusive correção pequena, refactor ou documentação — termina com uma
entrada em [`docs/WORKLOG.md`](docs/WORKLOG.md). A entrada registra:

- **Status:** Em andamento, Concluído ou Bloqueado;
- **Pedido:** o que foi solicitado;
- **Contexto:** por que a tarefa existe;
- **Decisão:** o que foi decidido e por quê;
- **Mudanças:** arquivos/áreas alterados;
- **Validação:** comandos executados e resultado;
- **Pendências:** o que ficou em aberto.

Regras: entradas são **append-only** (nunca apague ou reescreva), a mais recente fica no
topo e nenhuma entrada contém segredos ou dados reais. Esse histórico é a memória do
projeto entre sessões: é o que permite ao orquestrador continuar de onde parou e ao
usuário apenas dizer o que quer, sem repetir contexto.
