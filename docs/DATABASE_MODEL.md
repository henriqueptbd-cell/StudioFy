# 🗄️ Modelagem de Banco de Dados e Diagramas UML — StudioFy

Este documento contém a modelagem conceitual e lógica do banco de dados relacional PostgreSQL do **StudioFy**, bem como os diagramas UML que orientam as regras de segurança e transição de estados.

---

## 📊 1. Diagrama Entidade-Relacionamento (ERD)

O diagrama abaixo representa a estrutura de tabelas, tipos de dados e relacionamentos com isolamento Multi-tenant via `tenant_id`.

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "possui"
    TENANTS ||--o{ SERVICES : "oferece"
    TENANTS ||--o{ SCHEDULE_CONFIGS : "configura"
    TENANTS ||--o{ CUSTOMERS : "registra"
    TENANTS ||--o{ APPOINTMENTS : "gerencia"

    CUSTOMERS ||--o{ APPOINTMENTS : "solicita"
    SERVICES ||--o{ APPOINTMENTS : "pertence a"
    USERS ||--o{ APPOINTMENTS : "atende (opcional)"

    TENANTS {
        uuid id PK
        string name
        string slug UK
        string phone
        string timezone
        string logo_url
        string primary_color
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string email
        string password_hash
        string role
        boolean active
        timestamp created_at
    }

    SERVICES {
        uuid id PK
        uuid tenant_id FK
        string name
        string description
        integer duration_minutes
        decimal price
        boolean active
    }

    SCHEDULE_CONFIGS {
        uuid id PK
        uuid tenant_id FK
        integer day_of_week
        time open_time
        time close_time
        boolean is_closed
    }

    CUSTOMERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string phone
        timestamp created_at
    }

    APPOINTMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        uuid service_id FK
        uuid professional_id FK
        timestamp start_time
        timestamp end_time
        string status
        timestamp expires_at
        timestamp created_at
    }

```

---

## 🔄 2. Diagrama UML de Estados (Ciclo de Vida do Agendamento)

Abaixo é apresentado o modelo UML de máquina de estados para controle rigoroso das transições de um agendamento na camada de domínio.

```mermaid
stateDiagram-v2
    [*] --> PENDENTE : Cliente envia solicitação

    PENDENTE --> CONFIRMADO : Profissional/Admin aprova
    PENDENTE --> RECUSADO : Profissional/Admin nega
    PENDENTE --> CANCELADO : Expirado por Timeout (12h)

    CONFIRMADO --> CONCLUIDO : Atendimento finalizado
    CONFIRMADO --> CANCELADO : Cancelamento prévio

    RECUSADO --> [*]
    CANCELADO --> [*]
    CONCLUIDO --> [*]

```

---

## 🔐 3. Dicionário de Dados & Estratégia de Isolamento (RLS)

### Regra de Segurança Multi-Tenant (Row Level Security)

- **Chave Discriminadora:** Toda tabela (exceto `tenants`) contém a coluna `tenant_id` como Chave Estrangeira com restrição `ON DELETE CASCADE`.
- **Políticas do Postgres (RLS):** As consultas utilizam a variável de sessão `app.current_tenant_id` configurada pela conexão transacional (`withTenant`).
- **Regra de Isolamento:**

$$\text{Acesso Autorizado} \iff \text{linha.tenant\_id} = \text{current\_setting('app.current\_tenant\_id')}$$
