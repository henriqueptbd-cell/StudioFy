---
name: docs-writer
description: Atualiza a documentação do StudioFy (roadmap, contratos de API, modelo de dados, testes, arquitetura e AGENTS.md). Use ao concluir uma entrega, registrar decisões, sincronizar docs com o código ou explicar como o projeto funciona.
---

# Documentação

Leia `.agents/docs.md` e o documento que será alterado antes de editar.

## Procedimento

1. Confirme no código o comportamento real antes de documentar.
2. Registre a tarefa em `docs/WORKLOG.md` (Status, Pedido, Contexto, Decisão, Mudanças,
   Validação, Pendências), mantendo a entrada mais recente no topo.
3. Atualize o `docs/ROADMAP.md` marcando `[x]` apenas com evidência.
4. Mudou contrato HTTP? Atualize `docs/API_SPECIFICATION.md`.
5. Mudou schema? Atualize `docs/DATABASE_MODEL.md`.
6. Mudaram comandos/suítes? Atualize `docs/TESTING.md` e `AGENTS.md`.
7. Mantenha pt-BR, o estilo existente e os links relativos válidos.

## Regras

- Não invente comportamento nem marque itens sem validação.
- Não inclua segredos, tokens, credenciais ou dados reais.
- Commits de documentação seguem `docs:`.
- Ao final, liste os arquivos alterados e o motivo.
