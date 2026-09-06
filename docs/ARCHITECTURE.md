# 🏗️ Arquitetura e Engenharia do Sistema — StudioFy

O **StudioFy** é uma plataforma web SaaS multi-tenant de agendamento e gestão para negócios que atendem por horário (salões de beleza, barbearias, clínicas de estética)[cite: 1].

Este documento descreve as decisões arquiteturais, padrões de projeto, estrutura do banco de dados, fluxo de dados e práticas de código recomendadas para o desenvolvimento da aplicação.

---

## 📐 1. Visão Geral da Arquitetura

O sistema adota uma arquitetura em camadas (**Layered / Clean Architecture**) focada na separação de responsabilidades, facilidade de testes e desacoplamento do domínio de negócio em relação às dependências externas.

```
[ Cliente / Browser ]
        │
        ├───────────────────────┬───────────────────────┐
        ▼                       ▼                       ▼
  Área Pública             Área Autenticada        Área Autenticada
  (Agendamento)             (Profissional)           (Administrador)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                       [ API REST Node.js ]
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
    [ Controllers & Routes ]           [ Express Middlewares ]
               │                          (Auth, Tenant RLS)
               ▼                                 │
     [ Use Cases / Application ] ◄───────────────┘
               │
               ▼
     [ Domain Models & Logic ]
               │
               ▼
    [ Infrastructure Layer ]
  (Drizzle / Prisma / Repositories)
               │
               ▼
   [ PostgreSQL - Neon DB ]

```

---

## 🛠️ 2. Tech Stack

| Camada       | Tecnologia         | Justificativa / Uso |
| ------------ | ------------------ | ------------------- |
| **Frontend** | React + TypeScript |

| SPA reativa, fortemente tipada e focada em performance.

|
| **Estilização** | Tailwind CSS + CSS Variables | Facilita a abordagem _Mobile-first_ e a tematização dinâmica (White-label) por tenant.

|
| **Data Fetching** | TanStack Query (React Query)

| Gestão de cache, sincronização de estado com o servidor e gerenciamento de _loading/error_.

|
| **Backend** | Node.js + TypeScript + Express

| Ecossistema leve, escalável e produtivo com segurança de tipos.

|
| **Validação** | Zod | Validação de payloads de requisições DTOs e esquemas de dados no runtime. |
| **Banco de Dados** | PostgreSQL (via Neon DB)

| Banco relacional robusto com suporte nativo a Row Level Security (RLS) e escalabilidade Serverless.

|
| **ORM / Query Builder** | Drizzle ORM ou Prisma

| Tipagem ponta a ponta (Type-safe SQL) e migrações declarativas.

|
| **Integração** | WhatsApp via Links (`wa.me`)

| Geração dinâmica de mensagens sem dependência de APIs pagas no MVP.

|

---

## 🏢 3. Estratégia Multi-tenancy

O StudioFy foi projetado desde o início como um sistema **Multi-tenant**.

1. **Estratégia de Isolamento de Dados:**

- **Discriminator Column (`tenant_id`):** Todas as tabelas que possuem dados pertencentes a um estabelecimento possuem uma coluna `tenant_id`.

- **Row Level Security (RLS) do PostgreSQL:** Garantia no nível do banco de dados de que requisições referentes a um tenant não leiam nem alterem dados de outros estabelecimentos.

2. **Identificação do Tenant na API:**

- **Área Pública:** Resolvido via `slug` ou subdomínio presente na rota (ex: `/api/v1/public/tenants/:slug/services`).
- **Área Autenticada:** Extraído do token JWT autenticado do usuário do estabelecimento.

---

## 📊 4. Modelagem de Dados (Schema Relacional)

### Diagrama Entidade-Relacionamento (Conceitual)

```text
[ Tenant / Estabelecimento ]
  ├── 1:N ──> [ User ] (Admin / Profissional)
  ├── 1:N ──> [ Service ] (Serviços prestados)
  ├── 1:N ──> [ ScheduleConfig ] (Horários de funcionamento)
  ├── 1:N ──> [ Customer ] (Clientes cadastrados via formulário público)
  └── 1:N ──> [ Appointment ] (Agendamentos solicitados/realizados)

```

### Tabelas Principais (SQL Schema DDL)

```sql
-- Estabelecimentos (Tenants)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000000',
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuários Autenticados (Admins e Profissionais)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'PROFESSIONAL')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_users_tenant_email UNIQUE (tenant_id, email)
);

-- Serviços
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price DECIMAL(10, 2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes (Minimização de dados: Apenas Nome + Telefone)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_customers_tenant_phone UNIQUE (tenant_id, phone)
);

-- Configuração de Horários do Estabelecimento
CREATE TABLE schedule_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    CONSTRAINT uk_schedule_tenant_day UNIQUE (tenant_id, day_of_week)
);

-- Agendamentos
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    professional_id UUID REFERENCES users(id), -- Opcional no momento do agendamento
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'RECUSADO', 'CANCELADO', 'CONCLUIDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

---

## 🔄 5. Ciclo de Vida do Agendamento (Máquina de Estados)

Transições de estado válidas aplicadas obrigatoriamente na camada de domínio (_Domain Layer_):

```text
               ┌─────────────┐
               │  PENDENTE   │
               └──────┬──────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
  ┌─────────────┐           ┌─────────────┐
  │ CONFIRMADO  │           │  RECUSADO   │
  └──────┬──────┘           └─────────────┘
         │
   ┌─────┴────────────┐
   ▼                  ▼
┌─────────────┐  ┌─────────────┐
│  CONCLUIDO  │  │  CANCELADO  │
└─────────────┘  └─────────────┘

```

- **Regra de Transição:**
- `PENDENTE` ➔ `CONFIRMADO` (Ação do Profissional / Admin)

- `PENDENTE` ➔ `RECUSADO` (Ação do Profissional / Admin)

- `CONFIRMADO` ➔ `CONCLUIDO` (Finalização do Atendimento)

- `CONFIRMADO` ➔ `CANCELADO` (Cancelamento prévio)

---

## 📱 6. Integração com WhatsApp

No MVP, a integração ocorre **client-side** via links profundos (`wa.me`), sem chamadas pagas de servidor:

```text
[Ação no Painel] ──> [Gera Link Utilitário] ──> [Abre WhatsApp App/Web] ──> [Envio Manual]

```

**Exemplo de URL Gerada:**

```text
[https://wa.me/5511999999999?text=Olá%20Maria!%20Seu%20agendamento%20para%20Manicure%20no%20dia%2010/10%20às%2014:00%20foi%20CONFIRMADO](https://wa.me/5511999999999?text=Olá%20Maria!%20Seu%20agendamento%20para%20Manicure%20no%20dia%2010/10%20às%2014:00%20foi%20CONFIRMADO).

```

---

## 📂 7. Estrutura de Pastas Sugerida

### Backend (`/server`)

```text
src/
├── @types/               # Declarações de tipos customizados (Express Request, etc.)
├── config/               # Variáveis de ambiente e configs globais
├── modules/              # Módulos isolados por contexto de negócio
│   ├── appointments/     # Casos de uso de agendamento
│   │   ├── domain/       # Regras de transição de estado e validações
│   │   ├── useCases/     # Solicitar, Confirmar, Recusar, Listar
│   │   └── repositories/ # Interfaces e implementações do banco
│   ├── customers/        # Módulo de clientes
│   ├── services/         # Módulo de serviços
│   ├── tenants/          # Módulo do estabelecimento
│   └── users/            # Módulo de autenticação e equipe
├── shared/               # Recursos compartilhados
│   ├── errors/           # Classes de erros customizadas (AppError)
│   ├── middlewares/      # EnsureAuthenticated, TenantMiddleware, RateLimiting
│   └── infra/            # Conexão com o PostgreSQL / Drizzle
└── server.ts             # Bootstrapping da aplicação

```

### Frontend (`/web`)

```text
src/
├── assets/               # Imagens e ícones estáticos
├── components/           # Componentes genéricos de UI (Buttons, Inputs, Modals)
├── contexts/             # Contextos globais (AuthContext, ThemeContext)
├── hooks/                # Custom React Hooks
├── pages/                # Páginas organizadas por acesso
│   ├── public/           # Agendamento Público (Mobile-first para clientes)
│   ├── auth/             # Login / Recuperação de Senha
│   └── admin/            # Painel Interno (Agenda, Serviços, Profissionais)
├── services/             # Instância do Axios / API Client
├── utils/                # Formatadores de moeda, telefone e geradores de wa.me
└── App.tsx               # Rotas e Providers

```

---

## 🛡️ 8. Práticas de Segurança e Privaciade (LGPD)

1. **Minimização de Dados (LGPD):** Clientes finais informam apenas `Nome` e `Telefone` para criação da solicitação. Não é solicitada senha, e-mail ou dados sensíveis de saúde no MVP.

2. **Autenticação:** JWT (JSON Web Tokens) com curto tempo de expiração para Usuários/Administradores.

3. **Senhas:** Hashing obrigatório utilizando **Argon2id** ou **BCrypt**.
4. **Validação de Inputs:** Todos os payloads de requisição devem ser parseados rigorosamente via esquemas **Zod** para evitar _SQL Injections_ e _Mass Assignment_.

---

## 🚀 9. Convenções e Boas Práticas de Código

- **Commits:** Padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`).
- **Code Style:** ESLint + Prettier configurados com regras estritas do TypeScript.
- **Respostas HTTP Padronizadas:**

```json
// Sucesso
{
  "success": true,
  "data": { ... }
}

// Erro
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "O horário selecionado não está mais disponível."
  }
}

```
