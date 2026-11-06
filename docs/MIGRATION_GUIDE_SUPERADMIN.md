# Guia de aplicação — Console Superadmin e agenda pública

Este procedimento prepara as migrations da Console da Plataforma e da janela progressiva da agenda para o banco real. **Nenhuma migration foi aplicada em produção**: a validação desta tarefa usou somente o banco local `studiofy_e2e`.

## O que as migrations alteram

`backend/drizzle/0003_familiar_shockwave.sql`:

- adiciona `tenants.status` (`ACTIVE` por padrão), `paused_at` e `archived_at`, sem apagar dados existentes;
- cria `platform_admins`, identidade separada dos usuários dos salões;
- cria `platform_audit_logs`, com vínculo opcional ao tenant e índices;
- adiciona índices e uma constraint para os três estados permitidos.

`backend/drizzle/0004_public_booking_until.sql`:

- adiciona `tenants.public_booking_until` como `DATE NOT NULL`;
- preenche tenants existentes com a data local do estabelecimento +30 dias;
- define um default SQL de `CURRENT_DATE + 30`; o provisionamento da aplicação calcula
  explicitamente hoje +30 no timezone do novo tenant.

O comando de aplicação também reaplica `database/rls.sql` e `database/constraints.sql`. Esses scripts são idempotentes para a configuração esperada do StudioFy; o segundo recria os triggers de integridade e o trigger append-only da auditoria. Não rode `npm run db:migrate` para esta etapa, pois esse script também executa `drizzle-kit generate` e pode gerar arquivos novos localmente. Use `db:rls`, que aplica todas as migrations versionadas ainda pendentes e as políticas/constraints.

## Antes de começar

1. Faça e valide um backup/snapshot restaurável do banco real. Execute em uma janela de mudança e tenha acesso à pessoa responsável pelo PostgreSQL.
2. Confirme que o release contém `0003_familiar_shockwave.sql`, `0003_snapshot.json`, `0004_public_booking_until.sql`, `0004_snapshot.json` e o journal Drizzle atualizado. Se `0003` já foi aplicado em uma implantação anterior, `db:rls` aplicará somente `0004`; se ainda estiver pendente, aplicará ambas em ordem. Não edite o SQL versionado nem gere migration no servidor.
3. Confirme host e nome do banco sem imprimir a URL completa ou credenciais. Verifique o histórico Drizzle em `drizzle.__drizzle_migrations`; a migration nova deve aparecer somente depois da aplicação. Se o histórico real divergir dos arquivos `backend/drizzle/meta/_journal.json`, pare e reconcilie o estado com a pessoa responsável pelo banco antes de continuar.
4. Use uma URL de migração (`MIGRATION_DATABASE_URL`) com privilégio suficiente para criar/alterar tabelas e constraints. A URL da aplicação (`DATABASE_URL`) deve continuar usando a role restrita, sem `SUPERUSER` e sem `BYPASSRLS`. Não conceda `BYPASSRLS` à role da aplicação.
5. Defina `PLATFORM_JWT_SECRET` com um segredo aleatório forte de pelo menos 32 caracteres, diferente de `JWT_SECRET`, e mantenha `PLATFORM_JWT_EXPIRES_IN=15m`. Configure esses valores no gerenciador de segredos do ambiente, sem commitá-los, copiá-los para tickets ou mostrá-los em logs.

## Aplicar migration e políticas

No diretório raiz do checkout/release que contém os arquivos versionados, configure as variáveis no gerenciador de segredos ou no ambiente seguro do processo:

- `DATABASE_URL`: conexão da aplicação restrita para o banco de produção;
- `MIGRATION_DATABASE_URL`: conexão temporária de migração/owner para o mesmo banco;
- `JWT_SECRET`: segredo já usado pela autenticação dos salões (mínimo 32 caracteres);
- `PLATFORM_JWT_SECRET`: segredo independente da plataforma (mínimo 32 caracteres);
- `NODE_ENV=production`.

Confirme que as duas URLs apontam para o **mesmo banco real** por um método que não exiba usuário, senha ou query string. Então execute:

```bash
npm ci --prefix backend
npm run db:rls --prefix backend
```

Esse comando **não gera migration**: usa `MIGRATION_DATABASE_URL` para aplicar as migrations pendentes do journal e, em seguida, executa `database/rls.sql` e `database/constraints.sql`. Aguarde código de saída zero; não interrompa o processo entre migrations e scripts de segurança. Se falhar, guarde a mensagem sem segredos e pare para investigar antes de repetir qualquer operação manual.

## Permissões mínimas da role de aplicação

Após a migration, confira se a role usada por `DATABASE_URL` consegue ler e inserir a identidade e a auditoria, e atualizar o lifecycle/perfil do tenant. Se essas permissões ainda não existirem, aplique os grants com uma role proprietária, ajustando o nome `studiofy_app` para a role real:

```sql
GRANT SELECT, INSERT ON platform_admins TO studiofy_app;
GRANT SELECT, INSERT ON platform_audit_logs TO studiofy_app;
GRANT SELECT, UPDATE ON tenants TO studiofy_app;
```

Não conceda `UPDATE` nem `DELETE` em `platform_audit_logs`; o trigger do banco também bloqueia essas operações. A role normal continua sem `BYPASSRLS`. Os grants existentes nas tabelas de negócio e sequences não devem ser removidos por este procedimento.

## Verificações após a aplicação

Conectado ao banco real com uma role de inspeção apropriada, confirme:

```sql
SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id;
SELECT id, created_at FROM drizzle.__drizzle_migrations WHERE created_at IN (1793879291270, 1793890523999);

SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name IN ('status', 'paused_at', 'archived_at', 'public_booking_until')
ORDER BY column_name;

SELECT count(*) AS tenants_sem_data_publica
FROM tenants
WHERE public_booking_until IS NULL;

SELECT to_regclass('public.platform_admins'), to_regclass('public.platform_audit_logs');

SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'public.platform_audit_logs'::regclass
  AND NOT tgisinternal;
```

Confirme também que os tenants existentes aparecem com `status = 'ACTIVE'`, que `tenants_sem_data_publica` é zero, que os índices e a constraint de status estão presentes, e que a role da aplicação não tem `SUPERUSER` nem `BYPASSRLS`. Faça um smoke test controlado de login da aplicação, da console e leitura de Configurações > Agenda sem pausar ou arquivar um salão real durante a validação.

Para conferir a distribuição dos estados sem exibir dados de clientes:

```sql
SELECT status, count(*) FROM tenants GROUP BY status ORDER BY status;
```

## Criar o primeiro superadmin

Só faça este passo depois da migration, grants, deploy da versão correspondente e configuração do `PLATFORM_JWT_SECRET`. O comando não oferece cadastro público; ele cria uma linha em `platform_admins` e hasheia a senha. Execute-o com `DATABASE_URL` apontando para a role de aplicação do banco real e informe os valores interativamente, sem colocá-los no histórico do shell:

```bash
read -r -p "Nome do superadmin: " PLATFORM_ADMIN_NAME
read -r -p "E-mail do superadmin: " PLATFORM_ADMIN_EMAIL
read -r -s -p "Senha do superadmin (mínimo 12 caracteres): " PLATFORM_ADMIN_PASSWORD
printf '\n'
export PLATFORM_ADMIN_NAME PLATFORM_ADMIN_EMAIL PLATFORM_ADMIN_PASSWORD
npm run platform-admin:create --prefix backend
unset PLATFORM_ADMIN_NAME PLATFORM_ADMIN_EMAIL PLATFORM_ADMIN_PASSWORD
```

A senha não deve ser compartilhada nem reutilizada. O login fica em `/superadmin/login`. Antes de liberar o acesso a mais pessoas, lembre que MFA ainda não está implementado e que o token do navegador usa `sessionStorage`; essas limitações estão registradas em `SECURITY_AND_PRIVACY.md`.

## Rollback e cuidados

A migration é aditiva. Se houver problema após o deploy, a reversão preferida é voltar o código da aplicação para a versão anterior **mantendo o schema aditivo**. Não remova as tabelas, colunas, registros de auditoria nem entradas do journal como tentativa de rollback; isso pode perder trilha de auditoria ou quebrar uma versão já implantada. Não há migration destrutiva de downgrade. Qualquer restauração de backup deve seguir o plano de recuperação normal da operação e ser validada antes de reabrir o serviço.
