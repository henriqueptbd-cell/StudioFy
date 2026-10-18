# Papel: Documentação

Escopo: `docs/`, `readme.md`, `AGENTS.md` e demais arquivos markdown.

## Fontes de verdade e responsabilidades

- `docs/ROADMAP.md` — progresso executável do MVP. Só marque `[x]` com evidência
  (código + validação).
- `docs/API_SPECIFICATION.md` — contrato HTTP. Atualize ao mudar rota, payload,
  resposta ou código de erro.
- `docs/ARCHITECTURE.md` / `docs/FRONTEND_ARCHITECTURE.md` — padrões estruturais.
- `docs/DATABASE_MODEL.md` — tabelas, relações, RLS e máquina de estados.
- `docs/SECURITY_AND_PRIVACY.md` — LGPD, autenticação e autorização.
- `docs/TESTING.md` — ferramentas, comandos e suítes.
- `docs/visao_do_produto.md` — escopo, personas e regras de negócio.
- `docs/WORKLOG.md` — diário oficial de pedidos, decisões e mudanças. É a memória do
  projeto entre sessões e deve ser atualizado em **toda** tarefa.

## Convenções

- Escreva em português (pt-BR), mantendo o estilo e a estrutura já existentes.
- Mantenha o estilo e a acentuação do documento que está editando (os documentos mais
  antigos usam majoritariamente texto ASCII).
- Use tabelas, listas e blocos de código para facilitar a leitura por agentes.
- Links relativos entre documentos (`./ARQUIVO.md`).
- Não remova histórico de decisões; registre mudanças e o motivo.
- Commits de documentação seguem Conventional Commits (`docs:`).

## Fluxo

1. Ao iniciar uma tarefa, crie a entrada no `WORKLOG.md` com `Status: Em andamento`.
2. Ao concluir, preencha decisão, mudanças, validação e pendências e mude para
   `Concluído` (ou `Bloqueado`, se travar).
3. Atualize o item correspondente no `ROADMAP.md` apenas com evidência.
4. Se o contrato da API mudou, atualize `API_SPECIFICATION.md` na mesma entrega.
5. Se o schema mudou, atualize `DATABASE_MODEL.md`.
6. Se um comando ou suíte mudou, atualize `TESTING.md` e o `AGENTS.md`.
7. Verifique se os links continuam válidos.

## Registro (WORKLOG)

- Inserir a entrada mais recente logo abaixo do cabeçalho, sem apagar as anteriores.
- Usar o template de `docs/WORKLOG.md` (Status, Pedido, Contexto, Decisão, Mudanças,
  Validação, Pendências).
- Registrar também pedidos que não geraram código (pesquisa, análise, decisão de não
  fazer algo).
- Nunca incluir segredos, tokens ou dados reais.

## Guarda-corpos

- Não invente comportamento: documente o que o código realmente faz.
- Não marque itens como concluídos sem validação.
- Não inclua segredos, tokens, credenciais ou dados reais em exemplos.
