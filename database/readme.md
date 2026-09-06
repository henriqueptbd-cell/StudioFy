# 🗄️ StudioFy — Banco de Dados (PostgreSQL)

Este diretório contém as definições de schema, arquivos de migration, scripts SQL e documentação do banco de dados relacional **PostgreSQL**, hospedado no **Neon Database**.

---

## 📐 Estrutura e Multi-Tenancy

O isolamento entre estabelecimentos é garantido através do modelo de **Discriminator Column (`tenant_id`)** combinado com **Row Level Security (RLS)** nativo do PostgreSQL.

### Tabelas Principais

- `tenants`: Lojas/estabelecimentos cadastrados.
- `users`: Profissionais e Administradores autenticados.
- `services`: Serviços oferecidos por cada tenant.
- `customers`: Clientes cadastrados simplificados (Apenas Nome + Telefone).
- `schedule_configs`: Configuração de dias e horários de funcionamento.
- `appointments`: Registro e histórico dos agendamentos solicitados/confirmados.

---

## 🚀 Executando as Migrations e Seeds

1. Assegure-se de que a variável `DATABASE_URL` aponta para o seu banco Neon.
2. Para aplicar as alterações de schema no banco de dados:

   ```bash
   npm run migrate
   ```

3. Para rodar scripts de povoamento inicial (Ambiente de Dev):

   ```
   npm run seed

   ```
