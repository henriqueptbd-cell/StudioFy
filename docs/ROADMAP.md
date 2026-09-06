# 🗺️ Roadmap de Desenvolvimento do MVP — StudioFy

Este documento detalha as etapas, fases e tarefas necessárias para construir, testar e lançar a versão inicial (**MVP**) do StudioFy[cite: 1, 2].

---

## 📅 Visão Geral das Fases

```text
  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
  │  FASE 1   │ ──>│  FASE 2   │ ──>│  FASE 3   │ ──>│  FASE 4   │ ──>│  FASE 5   │
  │ Setup & DB│    │  Backend  │    │ Frontend  │    │  Deploy   │    │ Validação │
  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘

```

---

## 🛠️ FASE 1: Setup do Projeto & Banco de Dados

> **Objetivo:** Criar a estrutura base de repositório, banco de dados PostgreSQL e migrações iniciais.

- [ ] **1.1. Inicialização do Repositório**
- [ ] Criar estrutura de pastas (`/frontend`, `/backend`, `/database`, `/docs`)
- [ ] Adicionar `.gitignore` raiz e licença MIT
- [ ] Adicionar `ARCHITECTURE.md` e os arquivos `README.md` de cada pasta

- [ ] **1.2. Configuração do Neon Database (PostgreSQL)**
- [ ] Criar projeto no Neon DB
- [ ] Configurar variáveis de ambiente (`DATABASE_URL`) no backend

- [ ] **1.3. Modelagem do Banco (Drizzle ORM ou Prisma)**
- [ ] Criar schema da tabela `tenants` (id, name, slug, phone, logo_url, primary_color)
- [ ] Criar schema da tabela `users` (id, tenant_id, name, email, password_hash, role)
- [ ] Criar schema da tabela `services` (id, tenant_id, name, description, duration_minutes, price, active)
- [ ] Criar schema da tabela `customers` (id, tenant_id, name, phone)
- [ ] Criar schema da tabela `schedule_configs` (id, tenant_id, day_of_week, open_time, close_time, is_closed)
- [ ] Criar schema da tabela `appointments` (id, tenant_id, customer_id, service_id, professional_id, start_time, end_time, status)
- [ ] Gerar e executar a primeira Migration do banco de dados

---

## ⚙️ FASE 2: Backend & Regras de Negócio (API REST)

> **Objetivo:** Desenvolver os endpoints públicos e privados garantindo validações e isolamento multi-tenant.

- [ ] **2.1. Infraestrutura do Backend**
- [ ] Setup do Express + TypeScript + Zod
- [ ] Criar middleware global de tratamento de erros (`AppError`)
- [ ] Criar middleware de autenticação JWT (`ensureAuthenticated`)
- [ ] Criar middleware de isolamento de tenant (`tenantMiddleware`)

- [ ] **2.2. Módulo de Autenticação & Usuários**
- [ ] Endpoint de Login para Admins/Profissionais (`POST /api/v1/auth/login`)
- [ ] Endpoint de cadastro/gestão de profissionais pela Admin (`POST /api/v1/users`)

- [ ] **2.3. Módulo de Tenant & Configurações**
- [ ] Endpoint público de busca de informações do Tenant pelo slug (`GET /api/v1/public/tenants/:slug`)
- [ ] Endpoint administrativo para atualizar dados e cores do estabelecimento (`PATCH /api/v1/admin/tenant`)
- [ ] Endpoint para cadastro de horários de funcionamento (`POST /api/v1/admin/schedules`)

- [ ] **2.4. Módulo de Serviços**
- [ ] CRUD de Serviços (Listar, Criar, Editar, Desativar)

- [ ] **2.5. Módulo de Agendamentos (Core Domain)**
- [ ] Algoritmo de cálculo de slots/horários livres (recebe a data e duração do serviço e retorna horários disponíveis)
- [ ] Endpoint público de criação de solicitação (`POST /api/v1/public/appointments`) — Status inicial: `PENDENTE`
- [ ] Máquina de Estados: Endpoint de confirmação (`PATCH /api/v1/admin/appointments/:id/confirm`)
- [ ] Máquina de Estados: Endpoint de recusa (`PATCH /api/v1/admin/appointments/:id/reject`)
- [ ] Máquina de Estados: Endpoint de conclusão (`PATCH /api/v1/admin/appointments/:id/complete`)
- [ ] Endpoint de listagem da agenda do dia/semana para o profissional (`GET /api/v1/admin/appointments`)

---

## 📱 FASE 3: Frontend & Experiência do Usuário (React)

> **Objetivo:** Criar a interface mobile-first para o cliente agendar e a dashboard administrativa.

- [ ] **3.1. Setup do Frontend**
- [ ] Inicialização com Vite + React + TypeScript + Tailwind CSS
- [ ] Setup do TanStack Query (React Query) e React Router Dom
- [ ] Configurar sistema de temas dinâmicos via CSS Variables (`--primary-color`)

- [ ] **3.2. Fluxo Público de Agendamento (Mobile-First)**
- [ ] Tela 1: Visualização do Estabelecimento + Escolha do Serviço
- [ ] Tela 2: Seleção de Data e Horário (Calendário/Slots disponíveis)
- [ ] Tela 3: Formulário mínimo (Nome + Telefone)
- [ ] Tela 4: Confirmação do envio da solicitação (Aguardando aprovação)

- [ ] **3.3. Área Autenticada (Login & Dashboard Admin/Profissional)**
- [ ] Tela de Login (`/login`)
- [ ] Painel da Agenda (Visão de lista/cards por data com filtros de status)
- [ ] Ações rápidas nos Cards de Agendamento (Confirmar / Recusar / Concluir)
- [ ] Utilitário de WhatsApp: Botão que abre o link `wa.me` com mensagem pré-formatada de confirmação
- [ ] Tela de Gestão de Serviços (Adicionar/Editar preço e duração)
- [ ] Tela de Configurações da Loja (Nome, Logo, Cor Primária, Horários de Funcionamento)

---

## 🚀 FASE 4: Testes, Refinamento & Deploy

> **Objetivo:** Garantir a estabilidade da aplicação e colocar o MVP no ar.

- [ ] **4.1. Testes & Qualidade**
- [ ] Testar cenários de concorrência (dois agendamentos no mesmo horário)
- [ ] Validar responsividade em dispositivos mobile reais (iOS/Android)
- [ ] Garantir que o isolamento RLS do Postgres impede que um Tenant acesse dados de outro

- [ ] **4.2. Deploy**
- [ ] Deploy do Backend (Render / Railway / Fly.io)
- [ ] Deploy do Frontend (Vercel / Netlify)
- [ ] Configuração do banco de dados de produção no Neon DB

---

## 📌 Próximos Passos Pós-MVP (Backlog Futuro)

- [ ] Notificações automáticas via API oficial do WhatsApp
- [ ] Pagamentos online de sinal/reserva no momento do agendamento
- [ ] Escolha de profissional específico pelo cliente
- [ ] Histórico detalhado de clientes e relatórios financeiros
