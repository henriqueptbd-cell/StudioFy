# 🗄️ StudioFy — Banco de Dados (PostgreSQL)

Este diretório conterá as definições de schema, arquivos de migration, scripts SQL
e documentação do banco de dados relacional **PostgreSQL**, hospedado no **Neon Database**.

O schema inicial do Drizzle foi criado em `backend/src/db/schema.ts`. A migration
completa, as constraints de isolamento e a estratégia contra conflitos de horario
serão concluídas na Fase 2 do roadmap.

---

## 📐 Estrutura e Multi-Tenancy

O isolamento entre estabelecimentos é garantido através do modelo de **Discriminator Column (`tenant_id`)** combinado com **Row Level Security (RLS)** nativo do PostgreSQL.

### Tabelas Principais

- `tenants`: Lojas/estabelecimentos cadastrados.
- `users`: Profissionais e Administradores autenticados.
- `services`: Serviços oferecidos por cada tenant.
- `customers`: Clientes cadastrados simplificados (Apenas Nome + Telefone).
- `schedule_configs`: Configuração de dias e horários de funcionamento.
- `appointments`: Registro e histórico dos agendamentos solicitados, confirmados e cancelados.

---

## 🚀 Executando as Migrations e Seeds

1. Assegure-se de que a variável `DATABASE_URL` aponta para o seu banco Neon.
2. Para gerar e aplicar as alterações de schema no banco de dados, a partir de `backend/`:

   ```bash
   npm run db:migrate
   ```

3. Para rodar scripts de povoamento inicial (Ambiente de Dev):

   ```
   npm run db:seed

   ```
