# WORKLOG — Registro de pedidos, decisões e mudanças

> Diário oficial do projeto. **Toda tarefa** executada por um agente (orquestrador ou
> especialista) deve gerar uma entrada aqui. Este arquivo é a memória de longo prazo:
> permite que uma nova sessão entenda o que foi pedido, o que foi decidido e por quê,
> sem depender do histórico do chat.

## 2026-11-05 — Conferência dos módulos e da migration Superadmin

- **Status:** Bloqueado; migration online não concluída por falta de permissão.
- **Pedido:** Conferir a implementação documentada, sincronizar os módulos desta máquina e orientar a aplicação da migration no banco online.
- **Contexto:** A Console Superadmin está implementada, mas a migration foi validada apenas em `studiofy_e2e`; a produção continua pendente.
- **Decisão:** Sincronizar dependências pelo lockfile do backend. Para o banco real, seguir `docs/MIGRATION_GUIDE_SUPERADMIN.md` e usar `db:rls`, não `db:migrate`, que também gera migrations.
- **Mudanças:** Executado `npm ci --prefix backend`; identificada divergência em `docs/DATABASE_MODEL.md`, que ainda não descreve `platform_admins`, `platform_audit_logs` nem o lifecycle do tenant. A tentativa autorizada de `npm run db:rls --prefix backend` não concluiu: PostgreSQL retornou `42501 permission denied for database neondb`.
- **Validação:** `npm ls --depth=0 --prefix backend` e `npm run typecheck --prefix backend` aprovados. Não foi possível completar a migration nem reaplicar RLS/constraints; não foi feita alteração de permissões. O `npm ci` reportou 23 vulnerabilidades de dependências (15 moderadas, 6 altas e 2 críticas), sem correção automática.
- **Pendências:** Configurar `MIGRATION_DATABASE_URL` com credencial que tenha acesso e privilégios de migration no banco de desenvolvimento e repetir o comando; atualizar o modelo de banco para refletir o schema Superadmin.

## 2026-11-05 — Guia manual para migration em produção

- **Status:** Concluído; nenhuma ação executada no banco real.
- **Pedido:** Deixar a migration versionada e documentar como o proprietário poderá aplicá-la manualmente ao banco online.
- **Decisão:** A migration foi testada somente em `studiofy_e2e`; produção permanece intocada. O manual orienta backup, conferência do journal, uso separado de URL de migração e role da aplicação, grants mínimos, verificação pós-aplicação, bootstrap seguro do superadmin e rollback preservando o schema/auditoria.
- **Mudanças:** Criado `docs/MIGRATION_GUIDE_SUPERADMIN.md`; o guia aponta para `backend/drizzle/0003_familiar_shockwave.sql` e recomenda `npm run db:rls --prefix backend`, sem geração automática de novas migrations.
- **Validação:** Comando e ordem de execução conferidos em `backend/src/db/migrate.ts`; exemplos usam consultas de inspeção e não incluem credenciais. Nenhuma conexão ou comando foi direcionado ao banco de produção.
- **Pendências:** O proprietário aplicará a migration no banco real após backup e revisão do guia.

## 2026-11-05 — Conclusão: Console Superadmin (Fase 9)

- **Status:** Concluído e validado localmente.
- **Pedido:** Implementar diretamente em `main` a primeira versão da Console da Plataforma para listar salões, consultar métricas, editar campos permitidos, pausar/reativar e arquivar/restaurar contas.
- **Decisões:** Identidade `platform_admins` separada de usuários de salão, sem cadastro público; JWT, segredo, issuer e audience próprios; métricas sem PII calculadas por tenant com `withTenant`; grupos de 1–4 suprimidos; auditoria append-only para operações administrativas; arquivamento reversível sem expurgo automático. MFA e hardening adicional de sessão ficam pendentes.
- **Mudanças:** Migration `0003_familiar_shockwave.sql`, estados `ACTIVE`/`PAUSED`/`ARCHIVED`, rotas/controller/middleware de plataforma e bloqueios de tenant inativo; interface superadmin em sessão separada; comando privado `platform-admin:create`; trigger que impede UPDATE/DELETE no audit log; API spec, segurança, roadmap e testes atualizados.
- **Validação:** Migration aplicada somente em `studiofy_e2e`; role de teste sem `SUPERUSER`/`BYPASSRLS`. `npm test`: 10 arquivos/73 testes aprovados. `npm run test:e2e`: 2 cenários aprovados. Typechecks, lint (0 erros; 2 avisos preexistentes de Fast Refresh), build backend/frontend, Prettier e `git diff --check` aprovados. Build frontend mantém o aviso existente de bundle acima de 500 kB.
- **Segurança/produção:** Nenhuma migration executada em produção. A estratégia atual usa `sessionStorage`; revisar XSS, MFA e configuração de segredos fortes antes de ampliar o acesso. Exclusão permanente continua fora do escopo e sem endpoint.
- **Publicação:** Entrega validada para publicação diretamente em `main`, sem PR, conforme orientação do proprietário.
- **Pendências:** Definir MFA e armazenamento de token mais resistente a XSS; avaliar filtro temporal da lista; planejar eventual exclusão manual apenas com política de retenção e salvaguardas. A janela progressiva de liberação de agenda segue item separado no roadmap.

## 2026-11-05 — Implementar Console Superadmin

- **Status:** Em andamento
- **Pedido:** Implementar a primeira versão da página superadmin, com login de plataforma separado, listagem e estatísticas agregadas, edição permitida, pausa/reativação e arquivamento/restauração.
- **Contexto:** O proprietário autorizou schema e implementação após definirmos o escopo; o painel precisa atravessar tenants sem reutilizar identidade de salão nem contornar RLS.
- **Decisão:** Criar identidade de plataforma sem cadastro público, lifecycle explícito do tenant e auditoria; métricas serão calculadas por tenant usando o contexto RLS. Exclusão permanente fica fora; MFA pode ser endurecimento posterior. Nenhuma migration será executada em produção.
- **Mudanças:** Planejadas em schema/migration/RLS, API, frontend, testes e documentação de produto/segurança.
- **Validação:** Pendente.
- **Pendências:** Implementar, auditar, validar em banco local descartável e publicar diretamente em `main`, sem PR.

## 2026-11-05 — Publicação do mapa da Console da Plataforma

- **Status:** Concluído
- **Contexto:** Confirmação de publicação da atualização documental sobre a console superadmin e a liberação progressiva da agenda.
- **Publicação:** Commit `4b8aeaa` enviado diretamente para `main`, sem PR; o GitHub Actions CI terminou com sucesso (run `42012638071`).
- **Validação:** Prettier e `git diff --check` aprovados; nenhuma alteração de código ou execução de testes de aplicação nesta atualização documental.
- **Pendências:** A implementação da console e a especificação da janela de liberação da agenda permanecem conforme os itens abertos do roadmap.

## 2026-11-05 — Conclusão: mapa da Console e da liberação de agenda

- **Status:** Concluído
- **Pedido:** Registrar a futura página superadmin e, como item separado para detalhar depois, a abertura progressiva da agenda pública até uma data escolhida pelo salão.
- **Contexto:** O proprietário precisa gerir salões de forma distinta dos admins de tenant; a equipe também quer liberar datas futuras gradualmente sem expor toda a agenda de uma vez.
- **Decisão:** Planejar a Console após o piloto inicial, com identidade separada, dados analíticos agregados, pausa de login e novos pedidos sem apagar reservas existentes, arquivamento reversível e sem expurgo automático. Exclusão permanente fica manual, em etapa futura e com salvaguardas. A agenda permanece como está até especificarmos data padrão, limite máximo, papéis autorizados e comportamento ao reduzir a janela.
- **Mudanças:** `docs/ROADMAP.md` recebeu a Fase 9 e o refinamento da agenda; `docs/visao_do_produto.md` descreve o proprietário da plataforma; `docs/SECURITY_AND_PRIVACY.md` registra fronteira cross-tenant, minimização e decisões pendentes.
- **Validação:** Leitura do código confirmou limite atual de 30 dias no backend e seletor público com 8 datas consecutivas; Prettier e `git diff --check` aprovados. Nenhum código foi implementado nem testes de aplicação executados nesta tarefa documental.
- **Publicação:** Atualização documental será publicada diretamente em `main`, sem PR, conforme orientação do usuário.
- **Pendências:** Implementar a console só após definir identidade, acesso privilegiado, auditoria e retenção; especificar depois os parâmetros da liberação progressiva da agenda.

## 2026-11-05 — Planejar Console da Plataforma

- **Status:** Em andamento
- **Pedido:** Mapear no roadmap uma console restrita do proprietário da plataforma para listar salões, acompanhar estatísticas, pausar/reativar, editar e arquivar; manter a exclusão permanente manual e não automática.
- **Contexto:** A operação multi-tenant precisa de ferramentas próprias do dono da aplicação, distintas do painel ADMIN de cada salão, sem perder o histórico arquivado usado em análises.
- **Decisão:** Tratar como fase separada após o piloto inicial; usar arquivamento reversível sem expurgo automático e planejar a exclusão manual explícita em uma etapa posterior. Registrar limites de acesso, privacidade e auditoria ainda a decidir.
- **Mudanças:** Planejadas em `docs/ROADMAP.md`, `docs/visao_do_produto.md`, `docs/SECURITY_AND_PRIVACY.md` e este worklog.
- **Validação:** Pendente.
- **Pendências:** Incorporar os limites aprovados, revisar formatação e concluir o registro.

## 2026-11-05 — Conclusão: cadastro rápido e agendamento assistido

- **Status:** Concluído
- **Pedido:** Implementar diretamente na main o cadastro rápido de cliente e agendamento assistido por ADMIN/PROFESSIONAL, criando o horário como `CONFIRMADO`.
- **Contexto:** A equipe precisava registrar clientes atendidos por telefone ou presencialmente sem perder o histórico nem ocupar o slot manualmente fora do sistema.
- **Decisão:** Reutilizar cliente existente ou criar cliente novo na mesma operação; profissionais são associados a si mesmos e admins podem escolher profissional ativo do tenant. O banco continua protegendo conflitos sob concorrência; a exceção exata do trigger é mapeada para `409 SLOT_UNAVAILABLE`. Sem alteração de schema.
- **Mudanças:** Endpoint e testes de backend; modal mobile-first e integração na agenda; E2E de cliente existente; contrato, roadmap, testes, CI, visão do produto e instruções atualizados.
- **Validação:** `npm test`: 9 arquivos/65 testes e typechecks aprovados; `npm run test:e2e`: typecheck e 1 cenário aprovados; `npm run lint`: 0 erros e 2 avisos Fast Refresh em `AuthContext.tsx` e `BookingContext.tsx` não alterados; builds de backend e frontend de produção aprovados; Prettier dos novos arquivos/docs/E2E e `git diff --check` aprovados.
- **Publicação:** Commit `0d1e222` publicado diretamente em `main`, sem PR. GitHub Actions CI da implementação concluiu com sucesso (run `42007407817`).
- **Pendências:** Nenhuma para esta entrega; expiração automática, validação mobile e revisão operacional continuam no roadmap.

## 2026-11-05 — Cadastro rápido e agendamento assistido

- **Status:** Em andamento
- **Pedido:** Implementar diretamente na main o cadastro rápido de cliente e agendamento assistido por ADMIN/PROFESSIONAL, criando o horário como `CONFIRMADO`.
- **Contexto:** O sistema lista clientes e recebe agendamentos públicos, mas não permite à equipe registrar um agendamento feito por telefone/presencialmente.
- **Decisão:** Adicionar criação autenticada usando cliente existente ou dados de cliente novo, slot disponível do tenant, serviço ativo, validação de conflitos e status `CONFIRMADO`; profissionais são associados a si e admins podem escolher a profissional. Sem mudança de schema.
- **Mudanças:** Planejadas em backend, frontend, testes, `docs/API_SPECIFICATION.md`, `docs/ROADMAP.md`, `docs/TESTING.md`, `docs/visao_do_produto.md` e este worklog.
- **Validação:** Pendente.
- **Pendências:** Implementar, auditar, validar e publicar o commit diretamente em `main`, sem PR, conforme solicitado.

## 2026-11-05 — Autorizar profissionais a atualizar status da agenda

- **Status:** Concluído
- **Pedido:** Resolver a divergência entre a promessa de permissões dos profissionais e a autorização da API.
- **Contexto:** Visão do produto e segurança permitem que PROFESSIONAL opere solicitações; a rota de status hoje aceita somente ADMIN e a especificação diz que o profissional é somente leitura.
- **Decisão:** Permitir ADMIN e PROFESSIONAL apenas na rota de transição de status; o controller continua validando tenant e máquina de estados. Escritas de serviços, equipe e configurações permanecem exclusivas do ADMIN. Forma de entrega: commit direto em `main`, sem PR, conforme solicitado.
- **Mudanças:** `backend/src/routes/admin.routes.ts`; `backend/src/modules/appointments/useCases/phase4Step3.spec.ts`; `docs/API_SPECIFICATION.md`; `docs/visao_do_produto.md`; `docs/TESTING.md`; `docs/ROADMAP.md`; `docs/WORKLOG.md`.
- **Validação:** Teste de integração de agendamentos 11/11; `npm test` 8 arquivos/54 testes; `npm run test:e2e` typecheck + 1 cenário; `npm run lint` sem erros (2 warnings preexistentes); `npm run build` aprovado (warning preexistente de chunk Vite acima de 500 kB); Prettier e `git diff --check` aprovados.
- **Pendências:** Nenhuma para a autorização de status; testar a rotina/endpoint de expiração continua no roadmap.

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

## 2026-11-05 — E2E do fluxo principal de agendamento

- **Status:** Concluído
- **Pedido:** Implementar o teste E2E do fluxo principal e integrá-lo à CI existente.
- **Contexto:** Os testes Vitest já cobriam regras do backend, mas ainda faltava validar a jornada visível de um cliente até a confirmação pelo estabelecimento.
- **Decisão:** Usar Playwright/Chromium. A fixture cria tenant, credenciais, serviço e expediente pelas APIs reais; o navegador executa as telas pública e administrativa. O setup bloqueia bancos remotos ou fora de `_test`/`_e2e`, usa slug aleatório e portas separadas.
- **Mudanças:** `.github/workflows/ci.yml`; dependência e scripts na raiz (`package.json` e `package-lock.json`); `playwright.config.ts`; `tsconfig.e2e.json`; `e2e/booking-flow.spec.ts`; `.gitignore`; `AGENTS.md`; `docs/CI.md`; `docs/TESTING.md`; `docs/ROADMAP.md`; `docs/WORKLOG.md`.
- **Validação:** Em PostgreSQL local dedicado `studiofy_e2e`, `npm run test:e2e` passou (typecheck e 1 cenário); `npm test` passou (8 arquivos/52 testes); Prettier e `git diff --check` passaram; lint sem erros (2 warnings preexistentes); build aprovado (warning preexistente de bundle Vite acima de 500 kB).
- **Pendências:** A execução remota do GitHub Actions será verificada após abrir a PR nova; cobertura de estados de erro/carregamento, mobile e smoke test de produção segue no roadmap.

## 2026-11-05 — CI do GitHub Actions para pull requests

- **Status:** Concluído
- **Pedido:** Criar um workflow do GitHub Actions, documentar o funcionamento, testar, commitar e abrir um PR para revisão.
- **Contexto:** O repositório não tinha CI, e `npm test` na raiz fazia apenas typecheck em vez de executar a suíte Vitest.
- **Decisão:** Executar CI em PRs para `main` e pushes para `main`, com PostgreSQL 16 descartável. Migrations usam conexão administrativa e os testes usam role separada, sem `SUPERUSER`, `BYPASSRLS` ou herança de privilégios. O workflow usa `db:rls` para não gerar migrations no checkout.
- **Mudanças:** `.github/workflows/ci.yml`; `package.json` (`typecheck` separado e `test` incluindo Vitest); `AGENTS.md`; `docs/CI.md`; `docs/TESTING.md`; `docs/ROADMAP.md`; `docs/readme.md`; `readme.md`; `docs/WORKLOG.md`.
- **Validação:** Em PostgreSQL 16 local, `npm run db:rls --prefix backend` aplicado; `npm test` aprovado (8 arquivos, 52 testes); `npm run lint` aprovado sem erros (2 warnings já existentes no frontend); `npm run build` aprovado (aviso preexistente de chunk Vite acima de 500 kB); `git diff --check` aprovado.
- **Pendências:** Revisão e aceite do PR pelo usuário. A CI não altera regras de proteção da branch; o administrador pode marcar o check como obrigatório após revisar.

## 2026-10-24 — Fase 6: consulta de clientes do tenant

- **Status:** Concluído
- **Pedido:** Concluir a Fase 6 com a consulta de clientes vinculados ao tenant.
- **Contexto:** Último item pendente da Fase 6; a consulta precisa listar contatos sem vazar dados de outros tenants.
- **Decisão:** `GET /admin/customers` (ADMIN/PROFESSIONAL) com deduplicação por telefone via `selectDistinctOn` e busca opcional por nome/telefone; tela "Clientes" no painel com TanStack Query.
- **Mudanças:** `backend/src/modules/customers/useCases/listCustomers/ListCustomersController.ts` (novo); `backend/src/modules/customers/useCases/listCustomers/listCustomers.spec.ts` (novo); `backend/src/routes/admin.routes.ts`; `frontend/src/services/customers.ts` (novo); `frontend/src/pages/admin/CustomersPage.tsx` (novo); `frontend/src/types/index.ts`; `frontend/src/App.tsx`; `frontend/src/layouts/AdminLayout.tsx`; `docs/API_SPECIFICATION.md`; `docs/ROADMAP.md`; `docs/WORKLOG.md`.
- **Validação:** `npm run typecheck` (backend + frontend): ok; `npm run lint`: 0 erros (2 warnings pré-existentes); `npm run build --prefix frontend`: ok; `npm run test --prefix backend -- src/modules/customers/useCases/listCustomers/listCustomers.spec.ts`: 6/6 passando.
- **Auditoria:** bloqueada por infraestrutura — `sessions_spawn` rejeita todos os modelos deepseek com `Unknown model` (falta entrada em `models.providers["deepseek"].models[]`). Revisão feita pelo orquestrador + validação automatizada (typecheck, lint, build e 6/6 testes).
- **Pendências:** habilitar um modelo utilizável por subagentes e executar a auditoria cruzada. Config do Gateway: a tentativa de habilitar subagentes removeu o binding `agentRuntime` de `deepseek/deepseek-v4-pro`; revalidar em nova conversa.

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
