# Roadmap de Desenvolvimento do MVP - StudioFy

Este roadmap organiza o trabalho por dependencias e por entregas verificaveis. O MVP
deve permitir que um cliente solicite um horario e que o estabelecimento confirme,
recuse, conclua ou cancele o agendamento com seguranca entre tenants.

## Visao geral

```text
Decisoes do MVP
  |
  v
Fundacao e banco
  |
  v
Backend base e seguranca
  |
  v
Primeiro fluxo completo (API + cliente)
  |
  v
Painel administrativo
  |
  v
Testes, endurecimento e deploy
```

## FASE 0: Escopo e regras do MVP

> **Objetivo:** eliminar ambiguidades antes de implementar o calculo de horarios.

- [x] Confirmar o escopo: um tenant por operacao, com servicos, horarios gerais e agenda unica unificada.
- [x] Definir que o cliente nao escolhe a profissional; a distribuicao e responsabilidade interna do estabelecimento.
- [x] Definir que profissionais acessam a area autenticada para visualizar a agenda geral e confirmar ou recusar solicitacoes.
- [x] Definir o fuso horario do tenant como IANA, com padrao inicial `America/Sao_Paulo`.
- [x] Definir o armazenamento de agendamentos em UTC usando `TIMESTAMPTZ`; a API converte pelo timezone do tenant e o frontend exibe o horario local.
- [x] Definir o intervalo base dos slots como 30 minutos.
- [x] Definir que a duracao real do servico ocupa o intervalo completo, mesmo quando nao e multipla de 30 minutos.
- [x] Definir antecedencia minima de 2 horas, limite de 30 dias corridos e inicio baseado em `open_time`.
- [x] Definir que uma solicitacao `PENDENTE` bloqueia o horario.
- [x] Definir expiracao automatica do `PENDENTE` em 12 horas ou 1 hora antes do inicio, o que ocorrer primeiro, transicionando para `CANCELADO`.
- [x] Definir que o MVP usa somente os horarios globais do estabelecimento; disponibilidade individual fica para o pos-MVP.
- [x] Definir que nao havera reagendamento pelo sistema no MVP.
- [x] Definir que o cliente solicita cancelamento pelo WhatsApp; profissional ou admin pode cancelar pelo painel a qualquer momento.
- [x] Registrar os criterios de aceite do fluxo principal e das transicoes de status abaixo.

### Decisoes consolidadas

- O tenant possui uma agenda unica. O cliente nunca escolhe profissional durante o agendamento.
- O slot inicial avancara em blocos de 30 minutos, mas o conflito sera calculado por sobreposicao entre `start_time` e `end_time`.
- A disponibilidade considera somente `schedule_configs`, agendamentos `PENDENTE` e `CONFIRMADO`, antecedencia minima e janela de 30 dias.

## FASE 1: Fundacao do projeto

> **Objetivo:** transformar a estrutura existente em um ambiente reproduzivel de desenvolvimento.

### 1.1. Base existente

- [x] Criar as pastas `frontend`, `backend`, `database` e `docs`.
- [x] Criar a documentacao inicial de produto, arquitetura e READMEs.
- [x] Definir a stack inicial: React, Node.js, TypeScript, PostgreSQL, JWT e Zod.

### 1.2. Configuracao tecnica

- [x] Escolher definitivamente o Drizzle ORM.
- [x] Inicializar os projetos do backend e frontend com scripts executaveis.
- [x] Adicionar `.gitignore`, `.env.example` e validacao das variaveis de ambiente.
- [x] Configurar formatacao, lint e verificacao de tipos.
- [x] Criar seed local com um tenant, um administrador, servicos e horarios.
- [x] Definir os comandos oficiais de instalar, migrar, popular, testar e iniciar o projeto.

> A instalacao das dependencias e a execucao dos checks ficam pendentes de uma
> execucao local de `npm install` no backend e no frontend.

## FASE 2: Banco de dados e isolamento multi-tenant

> **Objetivo:** criar uma base consistente para as regras de negocio e impedir vazamento entre tenants.

> **Status:** concluida. Schema, migration, RLS, constraints, trigger de conflito e testes de seguranca foram executados com a role da aplicacao.

- [x] Criar as tabelas `tenants`, `users`, `services`, `customers`, `schedule_configs` e `appointments`.
- [x] Adicionar timestamps, status, flags de ativacao, indices e constraints necessarios.
- [x] Adicionar `tenants.timezone` com valor padrao `America/Sao_Paulo` e `appointments.expires_at` em UTC.
- [x] Garantir que cliente, servico e profissional de um agendamento pertencem ao mesmo tenant.
- [x] Definir as chaves estrangeiras e o comportamento de exclusao dos registros.
- [x] Criar migration inicial e um processo repetivel para aplica-la.
- [x] Configurar RLS e o contexto de tenant usado pelas conexoes do backend.
- [x] Testar leitura e escrita de um tenant tentando acessar dados de outro.
- [x] Implementar a estrategia para impedir sobreposicoes entre agendamentos `PENDENTE` e `CONFIRMADO`.
- [x] Confirmar que a role da aplicacao nao possui `SUPERUSER` nem `BYPASSRLS`.
- [x] Testar duas insercoes concorrentes e confirmar que somente uma e aceita.

## FASE 3: Backend base e seguranca

> **Objetivo:** disponibilizar uma API consistente, autenticada e validada.

> **Status:** concluida para o escopo atual. A cobertura automatizada esta descrita
> em [TESTING.md](./TESTING.md); testes especificos de agendamento e RLS continuam
> nas fases correspondentes.

- [x] Configurar Express, TypeScript, Zod, CORS e tratamento global de erros.
- [x] Implementar hash seguro de senhas e endpoint de login com JWT de expiracao curta.
- [x] Integrar `ensureAuthenticated`, contexto de tenant na requisicao e autorizacao por papel no fluxo autenticado atual, com consultas protegidas executadas pelo contexto RLS do tenant.
- [x] Aplicar rate limiting e validacao de entrada na rota publica de provisionamento; as rotas publicas de agendamento serao cobertas na Fase 4.
- [x] Criar o fluxo de provisionamento do primeiro administrador de um tenant.
- [x] Definir contratos de resposta e erros da API.

## FASE 4: Primeiro fluxo completo de agendamento

> **Objetivo:** entregar uma fatia funcional de ponta a ponta antes de ampliar o painel.

### 4.1. API publica

- [x] Buscar dados publicos do tenant pelo slug.
- [x] Listar servicos ativos do tenant.
- [x] Consultar horarios disponiveis para uma data e um servico.
- [x] Validar nome, telefone, servico, data, horario, limite de antecedencia e janela maxima de 30 dias.
- [x] Criar solicitacao publica com status inicial `PENDENTE`.
- [ ] Fazer a criacao de forma atomica, rejeitando conflitos mesmo sob concorrencia.
- [x] Bloquear sobreposicoes com agendamentos `PENDENTE` ou `CONFIRMADO`, considerando a duracao real do servico.
- [x] Criar rotina para expirar solicitacoes `PENDENTE` em 12 horas ou 1 hora antes do atendimento, o que ocorrer primeiro.

### 4.2. API autenticada minima

- [x] Listar a agenda por dia e semana, respeitando o papel do usuario.
- [x] Confirmar solicitacao: `PENDENTE` -> `CONFIRMADO`.
- [x] Rejeitar transicao invalida: `CONFIRMADO` -> `RECUSADO`.
- [x] Cancelar agendamento conforme a regra definida na Fase 0.
- [x] Permitir cancelamento pelo profissional ou administrador em qualquer status operacional permitido.
- [x] Concluir atendimento: `CONFIRMADO` -> `CONCLUIDO`.
- [x] Rejeitar transicoes de status invalidas na camada de dominio.

### 4.3. Criterios de aceite consolidados

- [x] Exibir somente servicos ativos, dias de funcionamento e horarios sem sobreposicao com `PENDENTE` ou `CONFIRMADO`.
- [x] Aceitar somente nome e telefone valido com DDD no formulario publico.
- [x] Criar novos pedidos com status `PENDENTE` e registrar `expires_at`.
- [x] Confirmar bloqueia o intervalo; transicoes invalidas sao rejeitadas.
- [x] Listar a agenda do tenant com dados do cliente, servico e link de WhatsApp.
- [x] Expirar `PENDENTE` libera o horario e altera o status para `CANCELADO`.
- [x] Concluir apenas registra o historico e nao altera disponibilidade futura.
- [x] Cancelar um agendamento libera o intervalo para novas solicitacoes.
- [x] Rejeitar qualquer transicao de status nao prevista na maquina de estados.

## FASE 5: Frontend publico

> **Objetivo:** permitir que o cliente complete o fluxo sem criar conta.

- [ ] Inicializar Vite, React, TypeScript, Tailwind, TanStack Query e React Router.
- [ ] Configurar tema do tenant por CSS Variables.
- [ ] Exibir estabelecimento e servicos ativos.
- [ ] Permitir selecionar data e horario realmente disponivel.
- [ ] Converter horario local do tenant para UTC antes do envio e formatar respostas UTC no horario local do tenant.
- [ ] Solicitar apenas nome e telefone.
- [ ] Exibir sucesso, erro, horario indisponivel e solicitacao duplicada.
- [ ] Validar o fluxo em telas pequenas e em conexoes lentas.

## FASE 6: Painel administrativo

> **Objetivo:** dar ao estabelecimento as ferramentas necessarias para operar a agenda.

- [ ] Criar login e protecao das rotas privadas.
- [ ] Exibir agenda com filtros por data, status e profissional.
- [ ] Implementar confirmar, recusar, cancelar e concluir.
- [ ] Gerar link `wa.me` com mensagem de confirmacao.
- [ ] Criar CRUD de servicos, incluindo ativar e desativar.
- [ ] Criar gestao de profissionais, incluindo ativar e desativar.
- [ ] Criar configuracao do tenant e horarios de funcionamento.
- [ ] Criar consulta de clientes vinculados ao tenant, sem expor dados de outros tenants.

## FASE 7: Testes e endurecimento

> **Objetivo:** validar comportamento, seguranca e operacao antes do deploy.

- [ ] Testar regras de dominio e todas as transicoes de status.
- [ ] Testar endpoints com sucesso, validacao, autorizacao e erro.
- [ ] Testar dois pedidos concorrentes para o mesmo horario.
- [ ] Testar RLS e isolamento em consultas, atualizacoes e exclusoes.
- [ ] Testar o fluxo principal com um teste E2E.
- [ ] Validar responsividade em dispositivos mobile reais ou emuladores.
- [ ] Revisar logs, mensagens de erro, CORS, rate limiting e segredos.
- [ ] Revisar acessibilidade basica, estados de carregamento e estados vazios.

## FASE 8: Deploy e operacao

> **Objetivo:** publicar uma versao reproduzivel e observavel do MVP.

- [ ] Criar banco de producao no Neon e aplicar migrations.
- [ ] Configurar variaveis de ambiente sem expor segredos no repositorio.
- [ ] Publicar o backend e configurar health check, logs e CORS.
- [ ] Publicar o frontend e configurar a URL da API.
- [ ] Configurar dominio, HTTPS e politica de origem permitida.
- [ ] Executar smoke test do fluxo principal em producao.
- [ ] Documentar rollback, backup e procedimento de restauracao.

## Backlog pos-MVP

- [ ] Notificacoes automaticas via API oficial do WhatsApp.
- [ ] Pagamentos online de sinal ou reserva.
- [ ] Escolha de profissional pelo cliente.
- [ ] Disponibilidade individual por profissional.
- [ ] Reagendamento pelo cliente.
- [ ] Historico detalhado e relatorios financeiros.
