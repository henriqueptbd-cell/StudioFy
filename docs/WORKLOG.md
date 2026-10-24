# WORKLOG — Registro de pedidos, decisões e mudanças

> Diário oficial do projeto. **Toda tarefa** executada por um agente (orquestrador ou
> especialista) deve gerar uma entrada aqui. Este arquivo é a memória de longo prazo:
> permite que uma nova sessão entenda o que foi pedido, o que foi decidido e por quê,
> sem depender do histórico do chat.

## Regras

1. **Toda tarefa gera uma entrada**, inclusive correções pequenas, refactors e docs.
2. **Nunca apague ou reescreva entradas antigas.** Se uma decisão mudou, crie uma nova
   entrada referenciando a anterior.
3. **Mais recente primeiro:** insira a nova entrada logo abaixo deste cabeçalho.
4. Ao iniciar uma tarefa, crie a entrada com `Status: Em andamento`. Ao concluir,
   preencha decisão, mudanças, validação e pendências e mude para `Concluído`.
5. Seja específico: cite arquivos, comandos e resultados.
6. Não inclua segredos, tokens, credenciais ou dados reais de clientes.
7. Decisões de arquitetura também devem ser refletidas no documento da área
   (`ARCHITECTURE.md`, `DATABASE_MODEL.md` etc.) e no `ROADMAP.md` quando aplicável.

## Modelo de entrada

```markdown
## AAAA-MM-DD — Título curto

- **Status:** Em andamento | Concluído | Bloqueado
- **Pedido:** o que foi solicitado, em uma frase.
- **Contexto:** por que a tarefa existe e o que motivou.
- **Decisão:** o que foi decidido e por quê (inclua alternativas descartadas).
- **Mudanças:** arquivos e áreas alterados.
- **Validação:** comandos executados e resultado.
- **Pendências:** o que ficou em aberto ou "nenhuma".
```

---

## 2026-10-24 — Fase 6: filtros da agenda e edição de serviços

- **Status:** Concluído
- **Pedido:** Seguir a recomendação do orquestrador e implementar os itens pendentes da Fase 6: filtros por data e profissional na agenda e edição/ativação de serviços.
- **Contexto:** A Fase 6 está parcial; login, agenda com filtro de status, transições, WhatsApp, configurações e equipe já existem. Faltam controles operacionais básicos do painel.
- **Decisão:** Sem mudança de schema (as colunas `appointments.professional_id` e `services.active` já existem). Backend: estender `GET /admin/appointments` com `professionalId` e nome do profissional; criar `PATCH /admin/services/:id` (ADMIN). Frontend: filtros de data/profissional na agenda e edição/ativação no catálogo de serviços.
- **Mudanças:** `backend/src/modules/appointments/useCases/listAppointments/ListAppointmentsController.ts` (filtro `professionalId` + join do profissional); `backend/src/modules/services/useCases/updateService/UpdateServiceController.ts` (novo); `backend/src/modules/services/useCases/updateService/updateService.spec.ts` (novo); `backend/src/routes/admin.routes.ts` (`PATCH /admin/services/:id`); `frontend/src/types/index.ts`; `frontend/src/services/appointments.ts`; `frontend/src/services/tenantServices.ts`; `frontend/src/utils/timezone.ts`; `frontend/src/pages/admin/AppointmentsPage.tsx`; `frontend/src/pages/admin/ServicesManagementPage.tsx`; `docs/API_SPECIFICATION.md`; `docs/ROADMAP.md`; `docs/WORKLOG.md`.
- **Validação:** `npm test` (typecheck backend + frontend): ok; `npm run lint`: 0 erros (2 warnings pré-existentes em contexts); `npm run build --prefix frontend`: ok; `npm run test --prefix backend -- src/modules/services/useCases/updateService/updateService.spec.ts`: 5/5 testes passando.
- **Pendências:** Falta o último item da Fase 6 (consulta de clientes do tenant). Teste E2E/mobile segue pendente (Fases 5/7). Nenhum commit/push realizado.

## 2026-10-24 — Orquestração no OpenClaw e triagem do estado

- **Status:** Concluído
- **Pedido:** Revisar a configuração de agentes do projeto e ajustá-la para que o agente principal do OpenClaw assuma o papel de orquestrador antes de retomar o desenvolvimento.
- **Contexto:** A configuração de agentes foi criada para o Cline (`.clinerules/` e `.cline/skills/`). O desenvolvimento passará a ser conduzido pelo OpenClaw, que precisa de instrução explícita de que o agente `main` é o orquestrador e de que as skills/subagentes do Cline são substituídos por ferramentas nativas do OpenClaw.
- **Decisão:** Registrar em `AGENTS.md` (§6) e em `.agents/README.md` que, em sessões do OpenClaw, o agente `main` assume `.agents/orchestrator.md` e usa subagentes/ferramentas nativas no lugar das skills do Cline. A precedência documentada permanece inalterada; só muda o executor.
- **Mudanças:** `AGENTS.md` (nova subseção "Orquestração no OpenClaw"); `.agents/README.md` (nova linha na tabela de camadas); `docs/WORKLOG.md`.
- **Validação:** Revisão documental; sem alteração de código. Configuração do Cline mantida intacta.
- **Pendências:** Retomar o desenvolvimento pela próxima fatia pendente do roadmap, com confirmação de escopo.

## 2026-10-18 — Onboarding de novos estabelecimentos e login local de teste

- **Status:** Concluído
- **Pedido:** Esclarecer como novos estabelecimentos e profissionais/admins se cadastram
  e criar um login novo para testar as funcionalidades.
- **Contexto:** O admin de seed (`admin@studiofy.local`) ainda usa hash placeholder e não
  permite login; era necessário um acesso funcional para validar a Fase 6.1 e o fluxo
  público.
- **Decisão:** O onboarding fica definido em três camadas: (1) novo estabelecimento +
  primeiro `ADMIN` via `POST /api/v1/public/tenants/provision` (tela `/novo-negocio`),
  com slug único e JWT inicial; (2) profissionais e admins adicionais **não têm
  autocadastro** — são criados pelo `ADMIN` em `POST /api/v1/admin/team` (tela
  `/admin/equipe`) e entram por `/admin/login` com slug + e-mail + senha; (3) cliente
  final do salão não cria conta, apenas informa nome e telefone no fluxo público e o
  backend reutiliza/cria o registro em `customers`. O login exige o slug porque o e-mail
  é único por tenant (`uk_users_tenant_email`). Não há convite por e-mail/WhatsApp nem
  recuperação de senha nesta fase.
- **Mudanças:** `docs/API_SPECIFICATION.md` (payload de provisionamento, exemplos de
  telefone do cliente em 10–11 dígitos e nota sobre o prefixo 55 no link do WhatsApp);
  `docs/WORKLOG.md`. Nenhuma alteração de código nesta tarefa; o tenant local de teste
  foi criado via endpoint real e recebeu um serviço, horário de funcionamento e
  agendamento de exemplo.
- **Validação:** `POST /api/v1/public/tenants/provision` 201; login do admin e do
  profissional 200; `GET /api/v1/admin/team` 200 para ambos e `POST` 403 para
  `PROFESSIONAL`; `GET /api/v1/public/tenants/:slug`, `/services` e `/slots` 200;
  `POST /api/v1/public/tenants/:slug/appointments` 201 (com telefone de 11 dígitos).
  Frontend Vite em `http://localhost:5173` e proxy `/api` para `http://localhost:3333`
  validados. `prettier --check docs/API_SPECIFICATION.md` OK.
- **Pendências:** Corrigir o hash placeholder do seed e torná-lo idempotente; implementar
  convite/recuperação de senha; decidir se o telefone do tenant será normalizado para
  10–11 dígitos no backend (hoje o formulário envia 11, mas a API aceita qualquer string
  com 10+ dígitos).

---

## 2026-10-18 — Fase 6.1: Gestão de equipe (API + tela)

- **Status:** Concluído
- **Pedido:** Implementar a gestão de profissionais no painel administrativo.
- **Contexto:** A tela `TeamManagementPage` era um placeholder e o backend não tinha
  rotas de membros. A fatia foi escolhida na triagem do roadmap.
- **Decisão:** Criar o módulo `team` no backend com `GET`, `POST` e `PATCH`
  `/api/v1/admin/team`, usando `withTenant`, `AuthProvider.hashPassword` e retornando
  apenas dados públicos (sem `passwordHash`). A tela passou a listar, cadastrar, editar,
  ativar e desativar membros; `PROFESSIONAL` tem acesso somente leitura. Foi adicionado
  o middleware `ensureActiveUser` para invalidar tokens de usuários desativados.
  Alternativa descartada: convite por WhatsApp nesta fatia (fica no backlog pós-MVP).
- **Mudanças:** `backend/src/modules/team/` (controllers e teste),
  `backend/src/shared/middlewares/ensureActiveUser.ts`, `backend/src/routes/admin.routes.ts`,
  `frontend/src/pages/admin/TeamManagementPage.tsx`, `frontend/src/services/team.ts`,
  `frontend/src/components/ui/Select.tsx`, `frontend/src/types/index.ts`,
  `docs/API_SPECIFICATION.md`, `docs/ROADMAP.md`, `docs/TESTING.md`,
  `docs/FRONTEND_ARCHITECTURE.md`, `backend/readme.md`, `docs/WORKLOG.md`.
- **Validação:** `npm run typecheck --prefix backend` e `--prefix frontend` OK;
  `npm test --prefix backend` (6 arquivos, 41 testes); `npm run lint` (0 erros, 2
  warnings pré-existentes); `npm run build --prefix frontend` OK; `prettier --check`
  nos arquivos novos e na documentação. `types/index.ts` e `admin.routes.ts` mantiveram
  o estilo original de 4 espaços para evitar diff de formatação.
- **Pendências:** Convite de profissionais via WhatsApp (backlog), filtros por data e
  profissional na agenda, CRUD completo de serviços, consulta de clientes e correção do
  seed (`admin@studiofy.local` ainda usa hash placeholder).

---

## 2026-10-18 — Triagem do roadmap e definição da próxima fatia

- **Status:** Concluído
- **Pedido:** Commitar a configuração de agentes e iniciar o fluxo do orquestrador de
  roadmap.
- **Contexto:** O roadmap pode estar desatualizado em relação ao código; a skill exige
  verificar o estado real antes de escolher a próxima tarefa. O commit `2ac28b7`
  registrou a configuração de agentes (22 arquivos).
- **Decisão:** O roadmap estava desatualizado. As Fases 4 e 5 estão implementadas; a
  Fase 6 está parcial (login, agenda, transições, WhatsApp e configurações prontos;
  faltam CRUD completo de serviços, equipe, filtros de data/profissional e consulta de
  clientes). Próxima fatia recomendada: **Fase 6.1 — Gestão de equipe** (backend +
  frontend), pois desbloqueia o filtro por profissional e o convite via WhatsApp.
  Alternativas de menor esforço: editar/ativar serviços e filtros de data na agenda.
- **Mudanças:** `docs/ROADMAP.md` (checkboxes sincronizados), `docs/TESTING.md`
  (contagem de testes), `docs/WORKLOG.md`.
- **Validação:** `npm test --prefix backend` (5 arquivos, 30 testes), `npm run lint`
  (0 erros, 2 warnings pré-existentes) e leitura do código de rotas/páginas.
- **Pendências:** Implementar a fatia escolhida da Fase 6; validação E2E/mobile e deploy
  continuam abertos.

---

## 2026-10-18 — Correção: disponibilidade de subagentes e Agent Teams

- **Status:** Concluído
- **Pedido:** Explicar como usar o Cline Desktop.
- **Contexto:** A documentação oficial foi consultada para responder com precisão.
- **Decisão:** Corrigir `.agents/README.md`: subagentes (`spawn_agent`) existem no CLI e
  no Desktop; Agent Teams (`/team`) existem no SDK, CLI e Kanban, mas não no Desktop.
  Rules (`AGENTS.md`, `.clinerules/`, `.cline/rules/`) e Skills (`.cline/skills/`)
  funcionam no VS Code, Desktop e CLI.
- **Mudanças:** `.agents/README.md`, `docs/WORKLOG.md`.
- **Validação:** Conferido em `docs.cline.bot` (Cline Desktop, Subagents, Agent Teams,
  Rules, Skills).
- **Pendências:** Nenhuma.

---

## 2026-10-18 — Registro obrigatório de pedidos e decisões

- **Status:** Concluído
- **Pedido:** Fazer o orquestrador documentar sempre tudo o que mexer, registrando a
  decisão tomada e o pedido recebido, para uso futuro como memória do projeto.
- **Contexto:** O usuário quer, no futuro, apenas dizer ao orquestrador o que deseja e
  deixar que ele distribua as tarefas, sem perder o histórico entre sessões.
- **Decisão:** Criar `docs/WORKLOG.md` como diário oficial, com entrada obrigatória no
  início e no fim de toda tarefa. A regra foi propagada para `AGENTS.md`,
  `.agents/orchestrator.md`, `.agents/docs.md`, `.agents/README.md`, `.clinerules/` e
  skills. Entradas são append-only e a mais recente fica no topo.
- **Mudanças:** `docs/WORKLOG.md` (novo), `AGENTS.md`, `.agents/orchestrator.md`,
  `.agents/docs.md`, `.agents/README.md`, `.clinerules/01-universal.md`,
  `.clinerules/docs.md`, `docs/readme.md` e as skills `roadmap-orchestrator`,
  `docs-writer`, `backend-dev`, `frontend-dev`, `database-dev` e `test-runner`.
- **Validação:** `npx prettier --check`, `npm test` e `npm run lint`.
- **Pendências:** Revisar e commitar a configuração de agentes.

---

## 2026-10-18 — Configuração inicial de agentes

- **Status:** Concluído
- **Pedido:** Criar `.agents` com um agente orquestrador que comanda os demais e
  explicar como funciona.
- **Contexto:** O projeto já tem roadmap, arquitetura e regras documentadas, mas não
  tinha nenhuma configuração de agentes.
- **Decisão:** Usar quatro camadas: `AGENTS.md` (constituição portátil), `.agents/`
  (papéis), `.clinerules/` (regras automáticas, com `paths:`) e `.cline/skills/`
  (especialistas sob demanda). Subagentes e Agent Teams são recursos de CLI/Desktop,
  não da extensão do VS Code.
- **Mudanças:** 20 arquivos em `AGENTS.md`, `.agents/`, `.clinerules/` e
  `.cline/skills/`.
- **Validação:** Prettier OK; `npm test` OK; `npm run lint` OK (2 warnings
  pré-existentes em `AuthContext.tsx` e `BookingContext.tsx`).
- **Pendências:** Commitar quando aprovado.
