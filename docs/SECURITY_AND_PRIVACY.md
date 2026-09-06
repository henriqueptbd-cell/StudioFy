# Segurança e Privacidade - StudioFy

Este documento registra os requisitos de segurança e privacidade do StudioFy. Ele
complementa o [ARCHITECTURE.md](./ARCHITECTURE.md) e deve ser usado junto com o
[ROADMAP.md](./ROADMAP.md) durante a implementação.

As regras abaixo definem o comportamento esperado do MVP. Decisões ainda pendentes
estão identificadas ao final do documento e devem ser resolvidas antes da
implementação da funcionalidade correspondente.

## 1. Objetivos de segurança

O sistema deve:

- impedir que um tenant leia, altere ou exclua dados de outro tenant;
- permitir que apenas usuários autenticados e autorizados operem a agenda;
- proteger credenciais, tokens, dados de contato e configurações do estabelecimento;
- reduzir abuso nas rotas públicas de agendamento;
- coletar somente os dados necessários para o funcionamento do MVP;
- registrar eventos suficientes para investigação sem expor dados pessoais ou segredos.

## 2. Escopo e ativos protegidos

Os principais ativos são:

- dados de tenants, serviços, horários e identidade visual;
- nome e telefone dos clientes;
- agenda e histórico de agendamentos;
- credenciais e tokens de administradores e profissionais;
- `DATABASE_URL`, `JWT_SECRET` e demais segredos de infraestrutura;
- logs, migrations, backups e ambientes de produção.

O cliente final não terá conta ou senha no MVP. Isso reduz dados armazenados, mas
exige proteção contra automação abusiva nas rotas públicas.

## 3. Modelo de confiança

Nenhum dado vindo do navegador deve ser considerado confiável. O backend deve
validar autenticação, autorização, tenant, formato e regras de negócio antes de
executar qualquer operação.

O `tenant_id` enviado em um payload ou parâmetro não pode determinar o tenant da
operação. O contexto deve ser obtido:

- pelo `slug` resolvido na rota pública; ou
- pelo tenant associado ao usuário autenticado no JWT.

A aplicação deve aplicar defesa em profundidade: autorização na API, validação na
camada de domínio e isolamento no PostgreSQL por RLS.

## 4. Isolamento multi-tenant

### 4.1. Resolução do tenant

- Rotas públicas resolvem o tenant por `slug` ou subdomínio.
- Rotas autenticadas usam o `tenant_id` do usuário autenticado.
- A API não deve aceitar troca arbitrária de tenant por meio de body, query string ou header controlado pelo cliente.
- Toda consulta a dados de negócio deve carregar o contexto do tenant.

### 4.2. Row Level Security

O PostgreSQL deve usar RLS nas tabelas que possuem dados de negócio. Antes de
consultar ou alterar dados, o backend deve estabelecer o tenant na mesma conexão ou
transação usada pela operação.

A configuração deve garantir que:

- uma política de leitura filtre pelo tenant atual;
- políticas de inserção validem o tenant da nova linha;
- políticas de atualização e exclusão filtrem pelo tenant atual;
- a role usada pela aplicação não possa ignorar RLS;
- migrations e operações administrativas usem uma credencial separada da aplicação;
- testes cubram leitura, inserção, atualização e exclusão entre dois tenants.

RLS não substitui autorização por papel. Ele impede vazamento entre tenants, mas não
define se um profissional pode editar uma configuração administrativa.

### 4.3. Integridade das relações

`customer_id`, `service_id` e `professional_id` de um agendamento devem apontar para
registros do mesmo tenant do agendamento. Essa regra deve ser garantida por
constraints compatíveis ou por validação transacional no domínio e no repositório.

## 5. Autenticação

A autenticação se aplica a administradores e profissionais.

- Senhas devem ser armazenadas somente como hash Argon2id ou bcrypt.
- A senha nunca deve aparecer em respostas, logs, seeds versionados ou mensagens de erro.
- O login deve responder com erro genérico para credencial inválida.
- O JWT deve conter apenas claims necessários, como `sub`, `tenant_id`, `role`, `iat` e `exp`.
- Tokens devem ter expiração curta e não devem ser aceitos após a conta ser desativada.
- `JWT_SECRET` deve ser fornecido por variável de ambiente e nunca ser versionado.
- A estratégia de armazenamento do token no frontend deve evitar exposição a XSS; se cookies forem usados, devem ser `HttpOnly`, `Secure` e `SameSite` apropriados.
- Recuperação de senha, refresh token e MFA ficam fora do MVP até serem especificados.

## 6. Autorização por papel

A API deve verificar autenticação e permissão em cada caso de uso protegido.

### Administrador

Pode gerenciar tenant, horários, serviços, profissionais, clientes e a agenda do
estabelecimento, respeitando as regras de domínio.

### Profissional

Pode consultar a agenda geral unificada, analisar solicitações, confirmar, recusar,
cancelar ou concluir atendimentos conforme as regras do domínio.
Não deve alterar identidade visual, outros usuários ou configurações administrativas
sem autorização explícita.

A interface pode ocultar ações sem permissão, mas a decisão final deve ocorrer no
backend.

## 7. Rotas públicas e prevenção de abuso

As rotas públicas de tenant, serviços, disponibilidade e criação de agendamento
devem:

- validar todos os parâmetros e payloads com Zod;
- limitar requisições por IP e, quando possível, por tenant;
- normalizar e validar telefone, data, horário e identificadores;
- rejeitar datas fora da janela permitida;
- evitar mensagens que revelem dados internos;
- impedir criação duplicada e tratar concorrência de forma atômica;
- limitar o tamanho de textos recebidos;
- registrar tentativas abusivas sem armazenar dados desnecessários.

CORS deve permitir somente as origens configuradas. Headers de segurança devem ser
ativados no backend, preferencialmente por middleware consolidado.

## 8. Banco de dados e infraestrutura

- A conexão com o PostgreSQL deve usar TLS em ambientes remotos.
- A aplicação deve usar uma role com o menor privilégio necessário.
- Segredos devem existir somente em variáveis de ambiente ou no gerenciador de segredos do provedor.
- Migrations devem ser revisadas e executadas de forma controlada.
- Backups de produção devem ser habilitados e ter restauração testada.
- Logs de banco, aplicação e provedor não devem conter senha, token, `DATABASE_URL` ou `JWT_SECRET`.
- Health checks não devem expor configuração, stack trace ou credenciais.

## 9. Privacidade e LGPD

O MVP deve seguir minimização e finalidade clara:

- o cliente informa apenas nome e telefone para solicitar um horário;
- não são necessários cadastro, senha, e-mail ou dados sensíveis;
- o telefone é usado para identificar a solicitação e permitir contato do estabelecimento;
- solicitacoes `PENDENTE` expiram em 12 horas ou 1 hora antes do atendimento, o que ocorrer primeiro;
- o acesso aos dados do cliente fica restrito ao tenant responsável e aos usuários autorizados;
- dados pessoais não devem ser incluídos em URLs, logs ou mensagens de erro;
- o sistema deve documentar retenção, exclusão e atendimento de solicitações do titular antes da operação em produção;
- o estabelecimento deve ser informado sobre sua responsabilidade pelos dados inseridos na plataforma.

A consulta pública do próprio agendamento, exportação, exclusão automatizada e
reagendamento não fazem parte do MVP. Esses fluxos precisam de requisitos próprios
antes de serem implementados.

## 10. Logs e resposta a incidentes

A aplicação deve registrar eventos operacionais sem registrar segredos ou dados
pessoais completos, incluindo:

- login bem-sucedido e falho, sem senha;
- alteração de permissões, usuários e configurações críticas;
- transições de status de agendamento;
- bloqueios por rate limiting;
- erros de autorização e falhas de RLS;
- falhas de migration, conexão e integração.

Em caso de incidente:

1. preservar logs e identificar o período afetado;
2. revogar ou trocar credenciais comprometidas;
3. bloquear a origem ou rota abusada;
4. avaliar tenants e dados afetados;
5. corrigir a causa e testar a correção;
6. documentar a ocorrência e as comunicações necessárias.

## 11. Checklist de implementação

### Fases 0 e 1 - decisões e fundação

- [ ] Definir armazenamento do JWT, política de retenção e fluxo de provisionamento.
- [ ] Escolher ORM, configurar validação de ambiente e manter `.env.example` sem segredos.
- [ ] Definir roles, permissões e critérios de auditoria.

### Fase 2 - banco e isolamento

- [ ] Implementar RLS e contexto de tenant por transação.
- [ ] Garantir integridade entre tenant e entidades relacionadas.
- [ ] Implementar prevenção atômica de conflitos de agenda.
- [ ] Criar testes de isolamento entre dois tenants.

### Fase 3 - backend

- [ ] Implementar hash de senha, JWT, autorização, Zod, CORS e rate limiting.
- [ ] Padronizar erros sem exposição de detalhes internos.
- [ ] Adicionar headers de segurança e logs estruturados com mascaramento.

### Fases 4 a 6 - produto

- [ ] Validar todas as rotas públicas e ações administrativas.
- [ ] Cobrir transições de status e concorrência com testes de integração.
- [ ] Evitar exposição de dados pessoais no frontend, URLs e mensagens.

### Fases 7 e 8 - lançamento

- [ ] Executar testes E2E, RLS e responsividade.
- [ ] Configurar segredos, TLS, CORS de produção, backups e health check.
- [ ] Executar smoke test e documentar rollback e resposta a incidentes.

## 12. Decisões pendentes

Antes do desenvolvimento das funcionalidades correspondentes, devem ser definidos:

- armazenamento do JWT no frontend;
- expiração, revogação e eventual refresh token;
- política de retenção e exclusão de clientes e agendamentos;
- limite de rate limiting por IP e tenant;
- necessidade de auditoria persistente além dos logs operacionais.
