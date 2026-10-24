# Configuração de agentes do StudioFy

Este diretório guarda os **papéis** (quem faz o quê). A configuração usa quatro
camadas complementares:

| Camada          | Onde                       | Para que serve                                                                                           |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Constituição    | `AGENTS.md` (raiz)         | Regras mestras, fontes de verdade e limites de autonomia.                                                |
| Papéis          | `.agents/*.md`             | Instruções detalhadas por área (orquestrador, backend, frontend, banco, testes, docs).                   |
| Regras do Cline | `.clinerules/*.md`         | Regras carregadas automaticamente; as condicionais usam `paths:` no frontmatter.                         |
| Skills do Cline | `.cline/skills/*/SKILL.md` | Especialistas acionáveis sob demanda (via `/nome` ou match da descrição).                                |
| Memória         | `docs/WORKLOG.md`          | Registro append-only de pedidos, decisões e mudanças; lido no início e atualizado no fim de toda tarefa. |
| Orquestração    | agente `main` (OpenClaw)   | Em sessões do OpenClaw, o agente principal assume o papel de `.agents/orchestrator.md` e usa subagentes/ferramentas nativas no lugar das skills do Cline. |

## Como usar

1. **Pedido amplo** ("siga o roadmap", "qual a próxima fase?"): o Cline lê o
   `AGENTS.md`, consulta o `docs/WORKLOG.md`, segue para `.agents/orchestrator.md` e
   delega às skills de área. Ao final, registra a entrega no WORKLOG.
2. **Pedido específico** ("ajuste o endpoint X"): a regra condicional
   (`.clinerules/backend.md`) ativa pelo caminho e aponta para `.agents/backend.md`.
3. **Skill explícita**: digite `/` no chat e escolha, por exemplo,
   `/roadmap-orchestrator`.

## Ordem de precedência

1. `AGENTS.md` e `.clinerules/` (sempre ativos).
2. `.agents/<área>.md` (papel da área em foco).
3. `.cline/skills/<área>/SKILL.md` (procedimento detalhado sob demanda).
4. Documentos em `docs/` (fonte de verdade do produto).

## Limites importantes

- **Rules + Skills** funcionam no VS Code, Desktop e CLI.
- **Subagentes** (`spawn_agent`) existem no CLI e no Desktop; não no VS Code/JetBrains.
- **Agent Teams** (`/team`) existem no SDK, CLI e Kanban; não no VS Code/JetBrains/Desktop.
- Autonomia é **semi-supervisionada**: implementação dentro das convenções pode ser
  autônoma; migrations, deploy, segredos, mudança de regra de negócio e
  `commit`/`push` exigem confirmação humana.
