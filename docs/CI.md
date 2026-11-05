# Integração contínua

O workflow do GitHub Actions está em `.github/workflows/ci.yml`. Ele roda em pull requests destinados à branch `main` e em pushes para `main`, para detectar falhas antes de integrar mudanças.

## O que é verificado

O job instala as dependências da raiz, do backend e do frontend e executa, nesta ordem:

1. Migrações do banco PostgreSQL e políticas de segurança;
2. `npm test`, que valida os tipos do backend e do frontend e executa a suíte Vitest do backend;
3. `npm run test:e2e`, que abre Chromium e percorre a solicitação pública, confirmação administrativa e agendamento assistido para cliente existente;
4. `npm run lint` para backend e frontend;
5. `npm run build` para backend e frontend.

A suíte inclui testes de integração para agendamentos e isolamento multi-tenant com Row Level Security (RLS), além de um E2E Playwright. Por isso, o workflow inicia um PostgreSQL 16 temporário chamado `studiofy_test` para cada execução. As migrações usam uma conexão administrativa separada; os testes usam a role `studiofy_app`, criada sem privilégios de superusuário, sem `BYPASSRLS` e sem herdar permissões. Ela não é dona das tabelas. Assim, os testes exercitam RLS de forma significativa, sem depender de um banco Neon nem de secrets de produção.

O E2E prepara dados descartáveis chamando o endpoint de provisionamento e os endpoints autenticados de serviço/expediente; depois, o navegador solicita um agendamento público, confirma-o no painel e cria outro agendamento assistido selecionando o mesmo cliente existente. Cada execução usa slug/credenciais aleatórios, mantém o fuso `America/Sao_Paulo` e inicia API e frontend em portas exclusivas (`3334`/`5174`). O setup rejeita bancos que não sejam locais e terminem em `_test` ou `_e2e`; não usa o seed de demonstração nem dados reais.

As credenciais e a chave JWT definidas no workflow são valores exclusivos do serviço efêmero de CI. Não são credenciais de produção e não devem ser reutilizadas fora dele. O workflow não publica o aplicativo nem altera serviços externos.

## Executar localmente

Com PostgreSQL disponível e as variáveis descritas em `backend/.env.example` configuradas, aplique as migrações usando uma conexão administrativa e execute:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm test
npm run test:e2e
npm run lint
npm run build
```

`npm test` e `npm run test:e2e` exigem `DATABASE_URL` apontando para uma role de aplicação sem `SUPERUSER` nem `BYPASSRLS`; para o E2E, o database deve terminar em `_test` ou `_e2e`, por exemplo `studiofy_e2e`. `MIGRATION_DATABASE_URL` deve apontar para uma conexão administrativa que aplique migrations e políticas. Os testes criam registros no banco configurado, então use um banco local isolado, nunca o banco de produção. No CI, as migrations usam `npm run db:rls --prefix backend`, que aplica o schema e as políticas sem gerar arquivos de migration. O comando `npm run test:e2e` roda `typecheck:e2e` via `tsconfig.e2e.json`, sobe e encerra os servidores locais sozinho; instale antes o browser com `npx playwright install chromium`.

## Uso dos checks no GitHub

Os resultados aparecem como checks no pull request. Se o projeto quiser impedir merges quando a CI falhar, um administrador deve marcar o job `Test, lint and build` como required check nas regras de proteção da branch `main`. A criação do workflow não altera essas configurações do repositório.
