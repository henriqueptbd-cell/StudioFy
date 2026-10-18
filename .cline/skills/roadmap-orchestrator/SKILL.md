---
name: roadmap-orchestrator
description: Coordena o trabalho seguindo docs/ROADMAP.md. Use quando o pedido for amplo ("siga o roadmap", "próxima fase", "implemente a fase X") ou quando for necessário dividir uma tarefa entre backend, frontend, banco, testes e documentação.
---

# Orquestrador do roadmap

## Objetivo

Transformar o `docs/ROADMAP.md` em entregas pequenas e verificáveis, delegando por
área e validando cada passo.

## Procedimento

1. Leia `AGENTS.md`, `docs/ROADMAP.md` e as últimas entradas de `docs/WORKLOG.md`.
2. Identifique a próxima fatia pendente respeitando as dependências entre fases.
3. **Confirme no código** se o item está realmente pendente; checkboxes podem estar
   desatualizados (ex.: o frontend já tem páginas que o roadmap marca como pendentes).
4. Escreva um plano curto: objetivo, arquivos afetados, critério de aceite e validação.
5. Delegue carregando a skill da área:
   - `backend-dev` → `backend/`
   - `frontend-dev` → `frontend/`
   - `database-dev` → `backend/src/db/`, `database/`
   - `test-runner` → testes, typecheck e lint
   - `docs-writer` → `docs/`, `AGENTS.md`
6. Integre os resultados e valide com `npm test` e `npm run lint`.
7. Registre a tarefa em `docs/WORKLOG.md` (Status, Pedido, Contexto, Decisão, Mudanças,
   Validação, Pendências) e atualize o `docs/ROADMAP.md` apenas com evidência.
8. Resuma: mudanças, validações e pendências.

## Limites

- Não execute deploy, migration em produção, rotação de segredos ou `push`.
- Não altere regra de negócio ou contrato público sem confirmação humana.
- Toda tarefa gera entrada no `docs/WORKLOG.md`, inclusive as que não mudam código.
- Se um item tocar várias áreas, divida: schema/RLS → API → UI → testes → docs.
- Em caso de bloqueio, pare e reporte em vez de inventar requisitos.
