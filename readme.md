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
└── docs/       # Documentação de Arquitetura, Requisitos, APIs e Diagramas
```

---

## 🛠️ Tech Stack Geral

- **Frontend:** React, TypeScript, Tailwind CSS, TanStack Query (React Query)
- **Backend:** Node.js, Express, TypeScript, Zod, JWT, Vitest, Supertest
- **Database:** PostgreSQL (Neon DB) com Drizzle ORM
- **Comunicação:** Integração via links dinâmicos do WhatsApp (`wa.me`)

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos

- Node.js (v18+ recomendado)
- npm, yarn ou pnpm
- Instância do PostgreSQL ou conta no [Neon DB](https://www.google.com/search?q=https://neon.tech)

### Passo a Passo

1. **Clonar o repositório:**

```bash
git clone [https://github.com/seu-usuario/studiofy.git](https://github.com/seu-usuario/studiofy.git)
cd studiofy

```

2. **Instalar as dependências:**

```bash
npm install
npm install --prefix backend
npm install --prefix frontend

```

3. **Configurar as Variáveis de Ambiente:**
   Crie o arquivo `.env` dentro da pasta `backend/` seguindo o exemplo de `backend/.env.example`.
4. **Executar Migrações e Seed do Banco de Dados:**

```bash
cd backend
npm run db:migrate
npm run seed

```

5. **Executar o Backend em Modo Dev:**

```bash
npm run dev

```

6. **Executar a Suíte de Testes Automatizados:**

```bash
npm test

```

7. **Executar o Frontend:**

```bash
cd ../frontend
npm run dev

```

---

## 📜 Princípios e Regras de Negócio

- **Minimização de Dados (LGPD):** O cliente final informa apenas **Nome** e **Telefone**.
- **Zero Atrito:** Sem criação de conta ou senhas para o cliente que está agendando.
- **Isolamento de Dados:** Arquitetura Multi-tenant com validação no nível da API e segurança via Row Level Security (RLS) no PostgreSQL.

---

## 📄 Documentação Técnica

Todas as especificações técnicas, decisões de engenharia e cronogramas estão centralizados na pasta [`/docs`](./docs):

- 🏛️ **[ARCHITECTURE.md](docs/ARCHITECTURE.md):** Visão arquitetural, componentes e stack técnica.
- 🗄️ **[DATABASE_MODEL.md](docs/DATABASE_MODEL.md):** Diagrama ERD (Mermaid), máquina de estados e regras de RLS.
- 🌐 **[API_SPECIFICATION.md](docs/API_SPECIFICATION.md):** Contrato completo de rotas públicos e administrativos da API REST.
- 🔐 **[SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md):** Diretrizes de LGPD, isolamento multi-tenant e autenticação JWT.
- 🧪 **[TESTING.md](docs/TESTING.md):** Estrutura e instrução para execução dos testes automatizados.
- 🗺️ **[ROADMAP.md](docs/ROADMAP.md):** Checklist de progresso e planejamento executável das fases do MVP.
- 📋 **[visao_do_produto.md](docs/visao_do_produto.md):** Escopo funcional, personas e regras do negócio.

---

## 📄 Licença

Este projeto está sob a licença [MIT](https://www.google.com/search?q=./LICENSE).

```

```
