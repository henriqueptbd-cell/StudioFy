# Testes - StudioFy

Este documento descreve como os testes do StudioFy são organizados, executados e
ampliados ao longo do desenvolvimento.

## Ferramentas

- **Vitest:** executor dos testes e assertions.
- **Supertest:** chamadas HTTP contra uma instancia Express em memoria.
- **TypeScript:** verificacao de tipos antes da execucao.
- **ESLint:** verificacao de qualidade e padrao do codigo.
- **Playwright:** teste de navegador do fluxo principal, incluindo cliente e painel administrativo.

O Vitest executa somente arquivos `src/**/*.spec.ts` e ignora `dist/`. A pasta
`dist` contem JavaScript compilado e nao deve ser descoberta como uma segunda copia
da mesma suite.

## Como executar

A partir da raiz do projeto:

```bash
npm run test
npm run lint
npm run build
```

Para executar o E2E, prepare antes um banco PostgreSQL local isolado cujo nome termine em `_test` ou `_e2e`, aplique as migrations e configure `DATABASE_URL` com a role restrita da aplicação:

```bash
NODE_ENV=test npm run test:e2e
```

`npm run test:e2e` primeiro executa `npm run typecheck:e2e` com `tsconfig.e2e.json` e então inicia backend/frontend em portas exclusivas. Cada execução prepara tenant, serviço e expediente por APIs locais. O cenário cria dados persistentes no banco escolhido, então não use o banco de produção nem um banco compartilhado.

Na raiz, `npm test` executa os typechecks do backend e do frontend e, em seguida, a suíte Vitest do backend. Os testes de integração exigem PostgreSQL configurado com uma role de aplicação restrita, sem `SUPERUSER` e sem `BYPASSRLS`.

Para executar somente os testes do backend:

```bash
npm run test --prefix backend
```

Para executar um arquivo especifico:

```bash
npm run test --prefix backend -- src/modules/auth/useCases/login/loginAndProvision.spec.ts
```

## Suíte atual

**A suíte validada contém 11 arquivos Vitest e 80 testes aprovados**, além de **3 cenários E2E Playwright**. Vitest cobre autenticação e provisionamento, gestão de serviços e equipe, clientes, regras de agendamento público e assistido, janela progressiva, conversão de fuso horário, concorrência, isolamento RLS entre tenants e a console da plataforma. A integração verifica que `PROFESSIONAL` pode consultar recursos permitidos, executar transições válidas e editar a abertura da agenda pública, mas recebe 403 ao tentar alterar serviços, equipe, perfil ou horários. Os testes de banco conectam ao PostgreSQL diretamente e devem usar uma role que não seja proprietária das tabelas e não tenha `SUPERUSER` nem `BYPASSRLS`.

Os cenários de `e2e/booking-flow.spec.ts` validam, pelo navegador: solicitação pública e confirmação; abertura pública inclusiva, bloqueio após o limite e agendamento assistido além da janela; login superadmin e pausa/reativação com motivo. O setup usa somente banco PostgreSQL loopback terminado em `_test` ou `_e2e`; não use produção nem banco compartilhado.

### Console da Plataforma (Fase 9)

`backend/src/modules/platform/platform.spec.ts` cobre:

- identidade e segredo JWT independentes; JWT de salão rejeitado nas rotas da plataforma;
- métricas carregadas via `withTenant`, sem PII e com supressão de contagens entre 1 e 4;
- edição limitada de perfil, motivo obrigatório e auditoria;
- pausa bloqueando sessão existente, novo login, consulta pública e criação pública;
- arquivamento reversível, ocultação operacional padrão e restauração com status explícito;
- trilha de auditoria append-only, inclusive bloqueio de tentativa de exclusão.

MFA, revisão da estratégia `sessionStorage`/XSS, filtro temporal da lista e smoke test em ambiente publicado permanecem pendentes antes de ampliar o uso em produção.

## Proximos testes

### Fase 2 - Banco e seguranca

Os testes abaixo ja foram executados com sucesso na role restrita da aplicacao:

- isolamento de leitura entre dois tenants;
- bloqueio de alteracao e exclusao entre tenants;
- role sem `SUPERUSER` e `BYPASSRLS`;
- concorrencia com somente uma insercao aceita.

- [x] Ler dados de dois tenants usando contextos RLS diferentes.
- [x] Tentar inserir, alterar e excluir dados usando o tenant incorreto.
- [x] Confirmar que a role da aplicacao nao possui `SUPERUSER` nem `BYPASSRLS`.
- [x] Enviar duas criacoes concorrentes para o mesmo intervalo e aceitar somente uma.

### Fase 4 - Agendamentos

- [x] Buscar tenant publico por slug.
- [x] Listar somente servicos ativos.
- [x] Calcular slots respeitando funcionamento, duracao e antecedencia.
- [x] Criar agendamento publico com status `PENDENTE`.
- [x] Rejeitar agendamento público para data além da janela inclusiva configurada pelo tenant.
- [x] Aplicar a janela pública configurável e inclusiva (default +30 dias; máximo +90 dias), validada em slots e criação.
- [x] Permitir consulta/criação assistida além da janela pública, preservando antecedência, expediente e conflito.
- [x] Validar o expediente configurado do estabelecimento na criacao.
- [x] Rejeitar agendamento duplicado no mesmo slot.
- [x] Confirmar agendamento: `PENDENTE` -> `CONFIRMADO`.
- [x] Rejeitar transicao invalida: `CONFIRMADO` -> `RECUSADO`.
- [x] Listar a agenda autenticada com dados do cliente e link `wa.me`.
- [x] Cancelar agendamento e liberar o slot para nova reserva.
- [x] Concluir atendimento: `CONFIRMADO` -> `CONCLUIDO`.
- [x] Criar agendamento assistido como `CONFIRMADO`, associando cliente existente ou cadastro rápido, com autorização e validações de slot.
- [x] Revisar conversao completa de timezone IANA no calculo de slots.
- [x] Rejeitar duplicidade e sobreposicao com `PENDENTE` ou `CONFIRMADO`, retornando `409 SLOT_UNAVAILABLE` também em corrida concorrente.
- [ ] Testar expiração de `PENDENTE` pelo endpoint administrativo.
- [ ] Validar todas as transicoes de status.

### Passo 3 da Fase 4

O teste `backend/src/modules/appointments/useCases/phase4Step3.spec.ts` cobre o
fluxo de criacao e transicao inicial do agendamento:

- criacao publica com status `PENDENTE`;
- rejeicao de solicitacao duplicada no mesmo slot;
- confirmacao administrativa para `CONFIRMADO`;
- rejeicao de transicao invalida para `RECUSADO`.

### Janela progressiva de agendamento

`backend/src/modules/appointments/useCases/bookingWindow.spec.ts` cobre:

- valor inicial de 30 dias e atualização da janela por `ADMIN` e `PROFESSIONAL`;
- datas inválidas, anteriores a hoje ou superiores a 90 dias, autorização e isolamento;
- limite inclusivo em slots e criação pública e erro `DATE_OUT_OF_RANGE` após o limite;
- slots e criação assistidos além da janela, ainda sujeitos a antecedência, expediente e conflitos;
- redução da janela sem cancelamento nem exclusão de reservas existentes.

### Gestao de equipe (Fase 6)

O teste `backend/src/modules/team/team.spec.ts` cobre:

- cadastro de profissional com senha hasheada e sem expor `passwordHash`;
- rejeicao de e-mail duplicado no mesmo tenant;
- listagem com isolamento entre tenants;
- bloqueio de cadastro por `PROFESSIONAL` (403);
- atualizacao de nome, papel, status e senha;
- bloqueio de auto-desativacao e auto-rebaixamento;
- bloqueio de login e de tokens de usuarios desativados.

### Fuso horario do tenant

O teste `backend/src/shared/utils/timezone.spec.ts` cobre a conversao entre o
relogio local do tenant e o instante UTC:

- conversao de horario local para UTC no fuso `America/Sao_Paulo`;
- conversao de meia-noite como inicio do dia local;
- conversao em um fuso diferente (`America/Manaus`);
- conversao reversa de UTC para horario local;
- datas proximas da virada do dia nao deslocam o calendario do tenant.

Os testes fixam o fuso de cada conversao explicitamente, de modo que o resultado
nao depende do fuso do processo que executa a suite.

### Frontend e operacao

- [x] Testar o fluxo principal: pedido público seguido de confirmação administrativa (Playwright).
- [ ] Testar estados de carregamento, erro e indisponibilidade.
- [ ] Executar E2E em viewport mobile.
- [ ] Executar smoke test no ambiente de producao.

## Regras para novos testes

- Cada teste deve verificar comportamento observavel, nao detalhes internos sem necessidade.
- Testes de integracao devem limpar ou isolar os dados criados.
- Credenciais reais nunca devem aparecer em testes, fixtures ou logs.
- Testes que dependem de PostgreSQL devem declarar claramente o ambiente necessario.
- A suite de autenticacao exige `DATABASE_URL` funcional; migrations devem usar
  `MIGRATION_DATABASE_URL` com a role proprietaria, nunca a role restrita da API.
- O CI deve executar test, typecheck, lint e build antes de aceitar alteracoes.
