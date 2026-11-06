# 🌐 Especificação das APIs REST — StudioFy

Este documento detalha o contrato de interface (endpoints, métodos HTTP, parâmetros e respostas) da API REST do **StudioFy**.

A API é dividida em dois grandes contextos:

1. **Pública (`/api/v1/public`)**: Acessível pelo cliente final para realizar agendamentos sem necessidade de autenticação.
2. **Administrativa (`/api/v1/admin` e `/api/v1/auth`)**: Acessível apenas por administradores e profissionais autenticados via JWT.

## Organização das rotas

As rotas são separadas por contexto no backend:

- `backend/src/routes/auth.routes.ts`: login e provisionamento inicial.
- `backend/src/routes/public.routes.ts`: tenant, serviços, slots e solicitações públicas.
- `backend/src/routes/admin.routes.ts`: agenda, serviços, equipe, configurações, transições de status e expiração.
- `backend/src/routes/index.ts`: apenas compõe os routers.

Essa separação evita concentrar autenticação, rotas públicas e operações
administrativas no mesmo arquivo. Os caminhos HTTP continuam sob `/api/v1`.

### Regras gerais

- Rotas públicas usam `publicRateLimiter`.
- Rotas administrativas exigem `Authorization: Bearer <JWT_TOKEN>`.
- O JWT informa `tenantId` e `role`; o backend estabelece o contexto RLS antes das operações no banco.
- `ADMIN` pode gerenciar serviços, equipe e configurações, além de operar a agenda.
- `ADMIN` e `PROFESSIONAL` podem consultar a agenda e alterar status de agendamentos, sempre respeitando a máquina de estados e o tenant autenticado.
- `PROFESSIONAL` tem acesso de leitura a serviços, clientes, equipe e configurações; alterações de serviços, equipe, perfil e horários são exclusivas de `ADMIN`. `ADMIN` e `PROFESSIONAL` podem alterar a data-limite de reservas públicas.
- Erros seguem `{ success: false, error: { code, message } }`.

---

## 🟢 1. Rotas de Autenticação e Provisionamento

### 1.1 `POST /api/v1/public/tenants/provision`

Cria um tenant e seu primeiro administrador. Retorna um JWT inicial.

- **Acesso:** Público, com rate limiting.
- **Request Body:**

```json
{
  "tenant": {
    "name": "Studio Beleza",
    "slug": "studio-beleza",
    "phone": "11999999999"
  },
  "admin": {
    "name": "Maria Silva",
    "email": "admin@studiobeleza.com",
    "password": "senha_segura"
  }
}
```

O `slug` deve ser único e usar apenas letras minúsculas, números e hífen. O admin
criado recebe a role `ADMIN`; profissionais e outros admins são cadastrados depois
por ele em `POST /api/v1/admin/team`.

O telefone do estabelecimento é enviado apenas com dígitos (DDD + número); o link
do WhatsApp adiciona o prefixo `55` quando necessário.

### 1.2 `POST /api/v1/auth/login`

Realiza a autenticação de profissionais e administradores. O `tenantSlug` é
obrigatório para que o usuário seja buscado dentro do tenant correto.

- **Acesso:** Público
- **Request Body:**

```json
{
  "tenantSlug": "studio-beleza",
  "email": "profissional@salao.com",
  "password": "senha_segura"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "uuid-v4",
      "name": "Maria Silva",
      "email": "profissional@salao.com",
      "role": "ADMIN",
      "tenantId": "uuid-v4"
    }
  }
}
```

---

## 🔵 2. Rotas Públicas (`/api/v1/public`)

Todas as rotas públicas dependem do `slug` do estabelecimento na URL.

### 2.1 `GET /api/v1/public/tenants/:slug`

Retorna as informações públicas e identidade visual do estabelecimento.

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "name": "Studio Beleza & Cia",
    "slug": "studio-beleza",
    "logoUrl": "https://...",
    "primaryColor": "#FF5733",
    "phone": "11999999999",
    "timezone": "America/Sao_Paulo",
    "publicBookingUntil": "2026-09-30"
  }
}
```

### 2.2 `GET /api/v1/public/tenants/:slug/services`

Lista os serviços ativos oferecidos pelo estabelecimento.

- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "Corte de Cabelo Feminino",
      "description": "Lavo, corto e escovo",
      "durationMinutes": 45,
      "price": "80.00"
    }
  ]
}
```

### 2.3 `GET /api/v1/public/tenants/:slug/slots?date=YYYY-MM-DD&serviceId=UUID`

Retorna os horários disponíveis para agendamento em um determinado dia.

- **Query Params:**
- `date`: Data no formato `YYYY-MM-DD`
- `serviceId`: ID do serviço selecionado

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "date": "2026-09-10",
    "availableSlots": ["09:00", "09:45", "10:30", "14:00"]
  }
}
```

O limite de `publicBookingUntil` é inclusivo e usa a data-calendário do timezone do tenant.
Datas posteriores retornam `400 DATE_OUT_OF_RANGE`; a consulta pública e a criação pública
aplicam o mesmo limite. O backend também impede que a API pública consulte ou grave datas
além de hoje local +90 dias, mesmo que o estado do banco seja alterado por fora da API.

### 2.4 `POST /api/v1/public/tenants/:slug/appointments`

Cria uma nova solicitação de agendamento.

- **Request Body:**

```json
{
  "serviceId": "uuid-v4",
  "startTime": "2026-09-10T14:00:00Z",
  "customer": {
    "name": "Ana Souza",
    "phone": "11988887777"
  }
}
```

- **Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "status": "PENDENTE",
    "startTime": "2026-09-10T14:00:00Z",
    "endTime": "2026-09-10T14:45:00Z",
    "expiresAt": "2026-09-10T02:00:00Z"
  }
}
```

- **Erro de conflito (409):** `SLOT_UNAVAILABLE` se outra requisição ocupar o horário
  após a checagem de disponibilidade e antes da gravação.
- **Erro de janela (400):** `DATE_OUT_OF_RANGE` se a data exceder `publicBookingUntil`
  ou o horizonte máximo de hoje local +90 dias.

---

## 🟠 3. Rotas Administrativas (`/api/v1/admin`)

Requer cabeçalho HTTP: `Authorization: Bearer <JWT_TOKEN>`.

### 3.1 `GET /api/v1/admin/appointments`

Lista a agenda do estabelecimento com suporte a filtros de data, status e profissional.

- **Query Params:** `startDate`, `endDate`, `status`, `professionalId`
- **Observação:** `startDate`/`endDate` são instantes ISO (UTC). O frontend converte o dia
  escolhido no fuso do tenant para UTC antes de enviar. `professionalId` é o `id` de um
  membro da equipe; quando ausente, retorna todos.
- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "status": "PENDENTE",
      "startTime": "2026-09-10T14:00:00Z",
      "endTime": "2026-09-10T14:45:00Z",
      "customer": {
        "name": "Ana Souza",
        "phone": "11988887777"
      },
      "service": {
        "name": "Corte de Cabelo Feminino",
        "durationMinutes": 45
      },
      "professional": {
        "id": "uuid-v4",
        "name": "Ana Souza"
      },
      "whatsappLink": "https://wa.me/5511988887777?text=..."
    }
  ]
}
```

### `POST /api/v1/admin/appointments` — agendamento assistido

Cria um agendamento registrado pela equipe, já confirmado, para um cliente que entrou
em contato por telefone ou presencialmente.

- **Acesso:** `ADMIN` e `PROFESSIONAL`.
- **Request Body:** `serviceId` UUID, `startTime` em ISO/UTC, `professionalId` opcional,
  e exatamente um entre `customerId` (cliente existente do tenant) ou `customer`
  (`name` + `phone`, para cadastro rápido no mesmo fluxo).
- **Atribuição:** um `PROFESSIONAL` é associado a si mesmo; não pode atribuir outro
  profissional. `ADMIN` pode atribuir um membro `PROFESSIONAL` ativo do próprio tenant
  ou deixar o agendamento sem atribuição.
- **Regras:** serviço ativo, cliente/profissional do tenant autenticado, antecedência
  mínima de 2 horas, expediente local do tenant e ausência de sobreposição com
  solicitações `PENDENTE` ou agendamentos `CONFIRMADO`. O fluxo assistido não aplica a
  janela pública e não possui horizonte máximo de dias nesta versão. Conflitos são
  verificados novamente na gravação; se outra requisição ocupar o slot no mesmo
  instante, a proteção transacional do banco retorna `SLOT_UNAVAILABLE`.
- **Response (201 Created):** agendamento com `status: "CONFIRMADO"` e
  `expiresAt: null`.
- **Erro de conflito (409):** `SLOT_UNAVAILABLE`.

```json
{
  "serviceId": "uuid-v4",
  "startTime": "2026-09-10T14:00:00Z",
  "customerId": "uuid-v4",
  "professionalId": "uuid-v4"
}
```

Para um cliente novo, envie `customer: { "name": "Ana Souza", "phone": "11988887777" }`
no lugar de `customerId`. Dados do cliente e agendamento são gravados na mesma operação.

### `GET /api/v1/admin/appointments/available-slots?date=YYYY-MM-DD&serviceId=UUID`

Consulta horários para o fluxo de agendamento assistido.

- **Acesso:** `ADMIN` e `PROFESSIONAL`.
- **Tenant:** derivado exclusivamente do JWT; nenhum `tenantId` é necessário ou usado na query.
- **Regras:** respeita expediente, antecedência mínima de 2 horas e conflitos; não aplica a
  data-limite pública. A criação do agendamento revalida as regras no backend.
- **Response (200 OK):** `{ "success": true, "data": { "date": "2026-09-10", "availableSlots": ["09:00", "09:30"] } }`.

### Configuração da janela pública

#### `GET /api/v1/admin/settings`

Retorna `data.tenant` e `data.schedule`. O perfil do tenant inclui
`publicBookingUntil` como `YYYY-MM-DD` no timezone IANA do estabelecimento.
`ADMIN` e `PROFESSIONAL` podem consultar.

#### `PUT /api/v1/admin/settings/booking-window`

Atualiza a última data que clientes podem reservar. O body é estrito:

```json
{ "publicBookingUntil": "2026-12-31" }
```

- **Acesso:** `ADMIN` e `PROFESSIONAL`.
- **Validação:** data ISO real entre hoje local e hoje local +90 dias, inclusive.
  O backend resolve timezone e tenant pela identidade autenticada; `tenantId` extra é
  rejeitado e a request não pode escolher outro estabelecimento.
- **Efeito de reduzir:** não apaga, cancela nem altera reservas existentes; somente
  consultas e novas reservas públicas passam a respeitar a data atualizada.
- **Response:** `{ "success": true, "data": { "publicBookingUntil": "2026-12-31" } }`.
- **Erro:** `400 DATE_OUT_OF_RANGE` para datas fora do intervalo e `400 VALIDATION_ERROR`
  para body/data inválidos.

### 3.2 `PATCH /api/v1/admin/appointments/:id/status`

Altera o status de um agendamento (Confirmar, Recusar, Cancelar, Concluir).

- **Acesso:** `ADMIN` e `PROFESSIONAL`.
- **Regra:** somente transições válidas da máquina de estados do agendamento são aceitas; ambas as roles operam apenas na agenda do próprio tenant.

- **Request Body:**

```json
{
  "status": "CONFIRMADO"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "status": "CONFIRMADO",
    "updatedAt": "2026-09-06T15:00:00Z"
  }
}
```

### 3.3 `POST /api/v1/admin/services`

Cadastra um novo serviço no estabelecimento.

- **Request Body:**

```json
{
  "name": "Design de Sobrancelha",
  "description": "Com aplicação de henna",
  "durationMinutes": 30,
  "price": 45.0
}
```

### 3.3.1 `PATCH /api/v1/admin/services/:id`

Atualiza um serviço existente. Todos os campos são opcionais, mas é preciso enviar ao
menos um. Usado para editar dados e para ativar/desativar o serviço.

- **Acesso:** `ADMIN`.
- **Request Body (todos opcionais):**

```json
{
  "name": "Corte + Barba",
  "description": "Com acabamento na navalha",
  "durationMinutes": 60,
  "price": 80.0,
  "active": false
}
```

- **Response (200 OK):** dados do serviço atualizado (`id`, `name`, `description`,
  `durationMinutes`, `price`, `active`).
- **Erros:** `SERVICE_NOT_FOUND` (404), `VALIDATION_ERROR` (400).

### 3.4 `GET /api/v1/admin/dashboard`

Rota protegida usada para validar autenticação, autorização de administrador e
contexto do tenant.

- **Acesso:** `ADMIN`.

### 3.5 `POST /api/v1/admin/appointments/expire`

Executa manualmente a rotina que cancela solicitações `PENDENTE` expiradas.

- **Acesso:** `ADMIN`.
- **Response:** quantidade de agendamentos expirados.

```json
{
  "success": true,
  "data": { "expiredCount": 1 }
}
```

### 3.6 `GET /api/v1/admin/team`

Lista os membros da equipe do tenant autenticado. Nunca retorna `passwordHash`.

- **Acesso:** `ADMIN` e `PROFESSIONAL` (somente leitura).
- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "Ana Souza",
      "email": "ana@studio.com",
      "role": "PROFESSIONAL",
      "active": true,
      "createdAt": "2026-10-18T12:00:00Z"
    }
  ]
}
```

### 3.7 `POST /api/v1/admin/team`

Cadastra um membro da equipe com senha inicial.

- **Acesso:** `ADMIN`.
- **Request Body:**

```json
{
  "name": "Ana Souza",
  "email": "ana@studio.com",
  "password": "senha_inicial",
  "role": "PROFESSIONAL"
}
```

- **Response (201 Created):** dados públicos do membro (`id`, `name`, `email`, `role`, `active`, `createdAt`).
- **Erros:** `EMAIL_ALREADY_EXISTS` (409), `VALIDATION_ERROR` (400).

### 3.8 `PATCH /api/v1/admin/team/:id`

Atualiza nome, papel, status ou senha de um membro.

- **Acesso:** `ADMIN`.
- **Request Body (todos os campos opcionais):**

```json
{
  "name": "Ana Souza",
  "role": "ADMIN",
  "active": true,
  "password": "nova_senha"
}
```

- **Regras:**
  - o administrador não pode desativar nem rebaixar a si mesmo;
  - o tenant precisa manter pelo menos um administrador ativo;
  - a senha, quando enviada, é armazenada apenas como hash.
- **Erros:** `CANNOT_DEACTIVATE_SELF`, `CANNOT_DEMOTE_SELF`, `LAST_ADMIN_REQUIRED`, `TEAM_MEMBER_NOT_FOUND` (404), `VALIDATION_ERROR` (400).

### 3.10 `GET /api/v1/admin/customers`

Lista os clientes vinculados ao tenant autenticado, deduplicados por telefone.

- **Acesso:** `ADMIN` e `PROFESSIONAL` (somente leitura).
- **Query Params:** `search` (opcional; casa por nome ou por telefone).
- **Regra de deduplicação:** quando o mesmo telefone possui mais de um registro de
  cliente, retorna o registro mais recente.
- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "Ana Souza",
      "phone": "11988887777",
      "createdAt": "2026-10-18T12:00:00Z"
    }
  ]
}
```

---

## 🔴 4. Respostas de Erro Padronizadas

Todas as falhas da API seguem o formato:

```json
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "O horário selecionado não está mais disponível para agendamento."
  }
}
```

---

## 5. Console da Plataforma (Superadmin)

A console usa identidade própria em `platform_admins`, independente de `users` dos salões. Não existe endpoint público de cadastro. A primeira conta e contas adicionais são provisionadas operacionalmente pelo comando `npm run platform-admin:create --prefix backend`, com `PLATFORM_ADMIN_NAME`, `PLATFORM_ADMIN_EMAIL` e `PLATFORM_ADMIN_PASSWORD` fornecidos como variáveis de ambiente protegidas. A senha deve ter pelo menos 12 caracteres. Configure `PLATFORM_JWT_SECRET` com valor forte, distinto de `JWT_SECRET`; a expiração padrão do token de plataforma é 15 minutos e o middleware revalida se o administrador continua ativo em cada chamada protegida.

Todas as rotas abaixo usam o prefixo `/api/v1/platform`. Apenas `POST /auth/login` é público (com rate limit); as demais exigem `Authorization: Bearer <platform-token>`. JWT de salão não é aceito nessa fronteira.

### Login e identidade

- `POST /auth/login` — corpo `{ "email": "...", "password": "..." }`; retorna token da plataforma e os campos públicos do administrador.
- `GET /me` — identidade da sessão atual; acesso registrado na auditoria.

### Lista, busca e métricas

- `GET /tenants?page=1&pageSize=20&q=...&status=ACTIVE|PAUSED|ARCHIVED` — lista por nome/slug, pagina e filtra por estado. Sem `status`, retorna contas operacionais (`ACTIVE` e `PAUSED`), excluindo arquivadas. Cada item inclui somente perfil operacional permitido e métricas agregadas; nenhum nome ou telefone de cliente, nem registro individual de agendamento, é retornado.
- `GET /overview` — totais globais agregados por status e atividade; a consulta de cada métrica de tenant roda sob `withTenant`, sem `BYPASSRLS`.

Contagens entre 1 e 4 são retornadas como `null` para reduzir identificação de grupos pequenos; zero é exibido como zero e valores de 5 ou mais são exatos. A mesma supressão vale para cada contagem de status de agendamento. O frontend não converte `null` em zero e indica que o subtotal é parcial.

### Perfil e ciclo de vida

Toda alteração exige `reason` (3–500 caracteres) e registra ator, tenant, finalidade, campos/transição e data em `platform_audit_logs`, na mesma transação da alteração:

- `PATCH /tenants/:tenantId` — altera somente `name`, `phone`, `logoUrl` e `primaryColor`; `slug` e `timezone` não são editáveis pela console.
- `POST /tenants/:tenantId/pause` e `POST /tenants/:tenantId/reactivate` — corpo `{ "reason": "..." }`; pausa bloqueia login, chamadas autenticadas existentes e rotas públicas, sem apagar histórico.
- `POST /tenants/:tenantId/archive` — corpo `{ "reason": "..." }`; arquiva sem exclusão automática e retira da lista operacional padrão.
- `POST /tenants/:tenantId/restore` — corpo `{ "status": "ACTIVE" | "PAUSED", "reason": "..." }`; a escolha de status é obrigatória e restauração não reativa por omissão.
- `GET /audit-logs?tenantId=<uuid>&limit=20` — últimos eventos vinculados ao tenant; a própria consulta também é auditada. Atualização e exclusão dos logs são bloqueadas por constraint/trigger no banco.

Ações de exclusão permanente não existem nesta versão. Arquivamento é reversível e preserva registros para análise posterior; a eventual exclusão manual exige requisitos e salvaguardas próprios. MFA não está implementado e deve ser tratado como hardening pendente antes de ampliar o acesso administrativo em produção.
