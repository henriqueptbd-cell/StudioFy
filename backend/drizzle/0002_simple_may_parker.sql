-- Migração gerada pelo drizzle-kit, tornada segura/idempotente para evitar
-- falha caso o índice já tenha sido removido por execução anterior parcial.
DROP INDEX IF EXISTS "uk_customers_tenant_phone";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_tenant_phone" ON "customers" USING btree ("tenant_id","phone");