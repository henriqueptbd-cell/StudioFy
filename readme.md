# 💈 StudioFy — Plataforma Multi-Tenant de Agendamento e Gestão

> **Simplicidade total para o cliente agendar, organização completa para o estabelecimento gerenciar.**

O **StudioFy** é uma plataforma SaaS _multi-tenant_ desenvolvida para salões de beleza, barbearias e clínicas de estética. O projeto prioriza uma experiência com zero atrito para o cliente final (sem necessidade de cadastro ou senha) e um painel completo para profissionais e administradores organizarem suas agendas e serviços.

---

## 🚀 Arquitetura e Visão do Sistema

O repositório é organizado de forma modular para separação clara de responsabilidades:

```text
.
├── backend/    # API REST em Node.js + Express + TypeScript
├── frontend/   # Aplicação Web React + TypeScript + Tailwind CSS (Mobile-First)
├── database/   # Schemas, Migrations e Scripts PostgreSQL (Neon DB)
└── docs/       # Documentação de Arquitetura, Requisitos e Diagramas

```

Para detalhes sobre as decisões técnicas e padrões de código, consulte o [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 🛠️ Tech Stack Geral

- **Frontend:** React, TypeScript, Tailwind CSS, TanStack Query (React Query)
- **Backend:** Node.js, Express, TypeScript, Zod, JWT
- **Database:** PostgreSQL (Neon DB), Drizzle ORM / Prisma
- **Comunicação:** Integração via links dinâmicos do WhatsApp (`wa.me`)

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos

- Node.js (v18+ recomendado)
- npm, yarn ou pnpm
- Instância do PostgreSQL (ou conta no [Neon DB](https://www.google.com/search?q=https://neon.tech))

### Passo a Passo

1. **Clonar o repositório:**

```bash
git clone [https://github.com/seu-usuario/studiofy.git](https://github.com/seu-usuario/studiofy.git)
cd studiofy

```

2. **Configurar o Banco de Dados:**
   Consulte as instruções em [`/database/README.md`](https://www.google.com/search?q=./database/README.md).
3. **Executar o Backend:**

```bash
cd backend
npm install
npm run dev

```

_Instruções detalhadas em [`/backend/README.md`](https://www.google.com/search?q=./backend/README.md)._ 4. **Executar o Frontend:**

```bash
cd ../frontend
npm install
npm run dev

```

_Instruções detalhadas em [`/frontend/README.md`](https://www.google.com/search?q=./frontend/README.md)._

---

## 📜 Princípios e Regras de Negócio

- **Minimização de Dados (LGPD):** O cliente final informa apenas **Nome** e **Telefone**.
- **Zero Atrito:** Sem criação de conta ou senhas para o cliente que está agendando.
- **Isolamento de Dados:** Arquitetura Multi-tenant com validação no nível da API e segurança via Row Level Security (RLS) no PostgreSQL.

---

## 📄 Licença

Este projeto está sob a licença [MIT](./LICENSE).
