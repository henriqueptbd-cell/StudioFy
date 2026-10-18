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
