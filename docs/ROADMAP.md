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

- [ ] Confirmar o escopo: um estabelecimento, seus profissionais, servicos e agenda.
- [ ] Definir o fuso horario do tenant e como datas serao armazenadas no banco.
- [ ] Definir o intervalo dos slots (por exemplo, 15 ou 30 minutos).
- [ ] Definir antecedencia minima, limite de dias futuros e horario de inicio da agenda.
- [ ] Decidir se uma solicitacao `PENDENTE` bloqueia o horario temporariamente.
- [ ] Definir se o MVP usa apenas horario do estabelecimento ou tambem disponibilidade individual do profissional.
- [ ] Definir as regras de cancelamento e se havera reagendamento no MVP.
- [ ] Escrever criterios de aceite para o fluxo principal e para cada transicao de status.

## FASE 1: Fundacao do projeto

> **Objetivo:** transformar a estrutura existente em um ambiente reproduzivel de desenvolvimento.

### 1.1. Base existente

- [x] Criar as pastas `frontend`, `backend`, `database` e `docs`.
- [x] Criar a documentacao inicial de produto, arquitetura e READMEs.
- [x] Definir a stack inicial: React, Node.js, TypeScript, PostgreSQL, JWT e Zod.

### 1.2. Configuracao tecnica

- [ ] Escolher definitivamente entre Drizzle ORM e Prisma.
- [ ] Inicializar os projetos do backend e frontend com scripts executaveis.
- [ ] Adicionar `.gitignore`, `.env.example` e validacao das variaveis de ambiente.
- [ ] Configurar formatacao, lint e verificacao de tipos.
- [ ] Criar seed local com um tenant, um administrador, servicos e horarios.
- [ ] Definir os comandos oficiais de instalar, migrar, popular, testar e iniciar o projeto.

## FASE 2: Banco de dados e isolamento multi-tenant

> **Objetivo:** criar uma base consistente para as regras de negocio e impedir vazamento entre tenants.

- [ ] Criar as tabelas `tenants`, `users`, `services`, `customers`, `schedule_configs` e `appointments`.
- [ ] Adicionar timestamps, status, flags de ativacao, indices e constraints necessarios.
- [ ] Garantir que cliente, servico e profissional de um agendamento pertencem ao mesmo tenant.
- [ ] Definir as chaves estrangeiras e o comportamento de exclusao dos registros.
- [ ] Criar migration inicial e um processo repetivel para aplica-la.
- [ ] Configurar RLS e o contexto de tenant usado pelas conexoes do backend.
- [ ] Testar leitura e escrita de um tenant tentando acessar dados de outro.
- [ ] Definir a estrategia para impedir dois agendamentos conflitantes no mesmo horario.

## FASE 3: Backend base e seguranca

> **Objetivo:** disponibilizar uma API consistente, autenticada e validada.

- [ ] Configurar Express, TypeScript, Zod, CORS e tratamento global de erros.
- [ ] Implementar hash seguro de senhas e login com JWT de expiracao curta.
- [ ] Implementar `ensureAuthenticated`, contexto de tenant e autorizacao por papel.
- [ ] Aplicar rate limiting e validacao de entrada nas rotas publicas.
- [ ] Criar o fluxo de provisionamento do primeiro administrador de um tenant.
- [ ] Definir contratos de resposta e erros da API.

## FASE 4: Primeiro fluxo completo de agendamento

> **Objetivo:** entregar uma fatia funcional de ponta a ponta antes de ampliar o painel.

### 4.1. API publica

- [ ] Buscar dados publicos do tenant pelo slug.
- [ ] Listar servicos ativos do tenant.
- [ ] Consultar horarios disponiveis para uma data e um servico.
- [ ] Validar nome, telefone, servico, data, horario e limite de antecedencia.
- [ ] Criar solicitacao publica com status inicial `PENDENTE`.
- [ ] Fazer a criacao de forma atomica, rejeitando conflitos mesmo sob concorrencia.

### 4.2. API autenticada minima

- [ ] Listar a agenda por dia e semana, respeitando o papel do usuario.
- [ ] Confirmar solicitacao: `PENDENTE` -> `CONFIRMADO`.
- [ ] Recusar solicitacao: `PENDENTE` -> `RECUSADO`.
- [ ] Cancelar agendamento conforme a regra definida na Fase 0.
- [ ] Concluir atendimento: `CONFIRMADO` -> `CONCLUIDO`.
- [ ] Rejeitar transicoes de status invalidas na camada de dominio.

## FASE 5: Frontend publico

> **Objetivo:** permitir que o cliente complete o fluxo sem criar conta.

- [ ] Inicializar Vite, React, TypeScript, Tailwind, TanStack Query e React Router.
- [ ] Configurar tema do tenant por CSS Variables.
- [ ] Exibir estabelecimento e servicos ativos.
- [ ] Permitir selecionar data e horario realmente disponivel.
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
