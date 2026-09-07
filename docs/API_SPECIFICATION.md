# 🌐 Especificação das APIs REST — StudioFy

Este documento detalha o contrato de interface (endpoints, métodos HTTP, parâmetros e respostas) da API REST do **StudioFy**.

A API é dividida em dois grandes contextos:

1. **Pública (`/api/v1/public`)**: Acessível pelo cliente final para realizar agendamentos sem necessidade de autenticação.
2. **Administrativa (`/api/v1/admin` e `/api/v1/auth`)**: Acessível apenas por administradores e profissionais autenticados via JWT.

## Organização das rotas

As rotas são separadas por contexto no backend:

- `backend/src/routes/auth.routes.ts`: login e provisionamento inicial.
- `backend/src/routes/public.routes.ts`: tenant, serviços, slots e solicitações públicas.
- `backend/src/routes/admin.routes.ts`: agenda, serviços, transições de status e expiração.
- `backend/src/routes/index.ts`: apenas compõe os routers.

Essa separação evita concentrar autenticação, rotas públicas e operações
administrativas no mesmo arquivo. Os caminhos HTTP continuam sob `/api/v1`.

### Regras gerais

- Rotas públicas usam `publicRateLimiter`.
- Rotas administrativas exigem `Authorization: Bearer <JWT_TOKEN>`.
- O JWT informa `tenantId` e `role`; o backend estabelece o contexto RLS antes das operações no banco.
- `ADMIN` pode gerenciar serviços e alterar status de agendamentos.
- `PROFESSIONAL` pode consultar a agenda; ações administrativas devem respeitar a autorização da rota.
- Erros seguem `{ success: false, error: { code, message } }`.

---

## 🟢 1. Rotas de Autenticação e Provisionamento

### 1.1 `POST /api/v1/public/tenants/provision`

Cria um tenant e seu primeiro administrador. Retorna um JWT inicial.

- **Acesso:** Público, com rate limiting.

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
    "phone": "5511999999999"
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
    "phone": "5511988887777"
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

Lista a agenda do estabelecimento com suporte a filtros de data e status.

- **Query Params:** `startDate`, `endDate`, `status`
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
        "phone": "5511988887777"
      },
      "service": {
        "name": "Corte de Cabelo Feminino",
        "durationMinutes": 45
      },
      "whatsappLink": "[https://wa.me/5511988887777?text=](https://wa.me/5511988887777?text=)..."
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
