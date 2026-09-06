# Testes - StudioFy

Este documento descreve como os testes do StudioFy são organizados, executados e
ampliados ao longo do desenvolvimento.

## Ferramentas

- **Vitest:** executor dos testes e assertions.
- **Supertest:** chamadas HTTP contra uma instancia Express em memoria.
- **TypeScript:** verificacao de tipos antes da execucao.
- **ESLint:** verificacao de qualidade e padrao do codigo.

## Como executar

A partir da raiz do projeto:

```bash
npm run test
npm run lint
npm run build
```

Para executar somente os testes do backend:

```bash
npm run test --prefix backend
```

Para executar um arquivo especifico:

```bash
npm run test --prefix backend -- src/modules/auth/useCases/login/loginAndProvision.spec.ts
```

## Suite atual

O primeiro teste automatizado esta em
`backend/src/modules/auth/useCases/login/loginAndProvision.spec.ts`.

Ele cobre o fluxo integrado da Fase 3:

- provisionamento de tenant e administrador;
- rejeicao de slug duplicado;
- login com credenciais validas e emissao de JWT;
- rejeicao de rota protegida sem token;
- acesso de rota protegida com token valido.

A suite atual foi executada com sucesso: **2 arquivos de teste e 10 testes aprovados**.

## O que este teste garante

O teste confirma a integracao entre Express, rotas, Zod, banco de dados, bcrypt,
JWT, middleware de autenticacao, autorizacao por papel e tratamento padronizado de
erros.

Ele nao substitui os testes especificos de RLS, concorrencia ou banco em isolamento.
A mensagem de resposta da rota protegida indica o contexto esperado, mas a prova de
isolamento deve consultar o PostgreSQL com dois tenants e uma role sem `BYPASSRLS`.

## Proximos testes

### Fase 2 - Banco e seguranca

- [ ] Ler dados de dois tenants usando contextos RLS diferentes.
- [ ] Tentar inserir, alterar e excluir dados usando o tenant incorreto.
- [ ] Confirmar que a role da aplicacao nao possui `SUPERUSER` nem `BYPASSRLS`.
- [ ] Enviar duas criacoes concorrentes para o mesmo intervalo e aceitar somente uma.

### Fase 4 - Agendamentos

- [ ] Listar somente servicos ativos.
- [ ] Calcular slots respeitando timezone, funcionamento e antecedencia.
- [ ] Rejeitar sobreposicao com `PENDENTE` ou `CONFIRMADO`.
- [ ] Expirar `PENDENTE` no prazo correto.
- [ ] Validar todas as transicoes de status.

### Frontend e operacao

- [ ] Testar o fluxo publico completo.
- [ ] Testar estados de carregamento, erro e indisponibilidade.
- [ ] Executar E2E em viewport mobile.
- [ ] Executar smoke test no ambiente de producao.

## Regras para novos testes

- Cada teste deve verificar comportamento observavel, nao detalhes internos sem necessidade.
- Testes de integracao devem limpar ou isolar os dados criados.
- Credenciais reais nunca devem aparecer em testes, fixtures ou logs.
- Testes que dependem de PostgreSQL devem declarar claramente o ambiente necessario.
- O CI deve executar test, typecheck, lint e build antes de aceitar alteracoes.
