# ⚙️ StudioFy — Backend (API REST)

Este diretório contém a API REST em **Node.js** que alimenta a aplicação StudioFy. O backend é estruturado em camadas (Clean Architecture) e lida com autenticação, regras de transição do agendamento e isolamento multi-tenant.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js + Express:** Servidor HTTP e gerenciamento de rotas.
- **TypeScript:** Tipagem estática end-to-end.
- **Zod:** Validação e parsing de payloads de requisição no runtime.
- **JWT (JSON Web Token):** Autenticação de Administradores e Profissionais.
- **Drizzle ORM / Prisma:** Query Builder / ORM para interagir com o PostgreSQL.

---

## 📂 Estrutura de Pastas

```text
src/
├── @types/          # Tipagens globais do TypeScript (express request customizado)
├── config/          # Variáveis de ambiente e secrets
├── modules/         # Módulos encapsulados por contexto
│   ├── appointments/# Casos de uso e regras de agendamento
│   ├── customers/   # Cadastro/Consulta simples de clientes
│   ├── services/    # Gestão dos serviços oferecidos
│   ├── tenants/     # Dados e configurações do estabelecimento
│   └── users/       # Autenticação e gestão da equipe
├── shared/          # Middlewares globais, manipuladores de erro e conexões
└── server.ts        # Ponto de entrada da API

```

---

## 🚀 Como Executar

1. Instale as dependências:

```bash
npm install

```

2. Configure as variáveis no `.env`:

```env
PORT=3333
DATABASE_URL=postgresql://user:password@neon-db-url/studiofy?sslmode=require
JWT_SECRET=sua_chave_secreta_aqui

```

3. Execute as migrações do banco (veja a pasta `/database`):

```bash
npm run db:migrate

```

4. Inicie a API em modo de desenvolvimento:

```bash
npm run dev

```
