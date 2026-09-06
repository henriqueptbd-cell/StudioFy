# ⚙️ StudioFy — Backend (API REST)

Este diretório contém a API REST em **Node.js** que alimentará a aplicação StudioFy. O backend seguirá uma arquitetura em camadas (Clean Architecture) e lidará com autenticação, regras de transição do agendamento e isolamento multi-tenant.

O projeto está na fundação executável. O ORM escolhido é o **Drizzle ORM** e a
implementação dos módulos de negócio seguirá as próximas fases do roadmap.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js + Express:** Servidor HTTP e gerenciamento de rotas.
- **TypeScript:** Tipagem estática end-to-end.
- **Zod:** Validação e parsing de payloads de requisição no runtime.
- **JWT (JSON Web Token):** Autenticação de Administradores e Profissionais.
- **Drizzle ORM:** Query builder tipado e migrations para PostgreSQL.

---

## 📂 Estrutura de Pastas

```text
src/
├── @types/          # Tipagens globais do TypeScript (Express Request customizado)
├── config/          # Variáveis de ambiente e secrets
├── modules/         # Módulos encapsulados por contexto
│   ├── appointments/ # Casos de uso e regras de agendamento
│   ├── customers/   # Cadastro/Consulta simples de clientes
│   ├── services/    # Gestão dos serviços oferecidos
│   ├── tenants/     # Dados e configurações do estabelecimento
│   └── users/       # Autenticação e gestão da equipe
├── shared/          # Middlewares globais, manipuladores de erro e conexões
└── server.ts        # Ponto de entrada da API

```

---

## 🚀 Como Executar

1. Instale as dependências após a inicialização do projeto:

```bash
npm install

```

2. Copie `.env.example` para `.env` e configure as variáveis:

```env
PORT=3333
DATABASE_URL=postgresql://user:password@neon-db-url/studiofy?sslmode=verify-full
MIGRATION_DATABASE_URL=postgresql://owner:password@neon-db-url/studiofy?sslmode=verify-full
JWT_SECRET=sua_chave_secreta_aqui

```

`DATABASE_URL` deve apontar para a role restrita `studiofy_app`. Use
`MIGRATION_DATABASE_URL` com a role proprietaria/admin somente para executar
migrations e aplicar RLS.

3. Execute as migrações do banco (comando oficial previsto):

```bash
npm run db:migrate

```

4. Popule os dados de desenvolvimento, quando necessário:

```bash
npm run db:seed
```

5. Inicie a API em modo de desenvolvimento:

```bash
npm run dev

```
