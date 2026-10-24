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
- `ADMIN` pode gerenciar serviços, equipe e alterar status de agendamentos.
- `PROFESSIONAL` pode consultar a agenda e a equipe (somente leitura); ações administrativas devem respeitar a autorização da rota.
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
    "phone": "11999999999"
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

### 3.2 `PATCH /api/v1/admin/appointments/:id/status`

Altera o status de um agendamento (Confirmar, Recusar, Cancelar, Concluir).

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
