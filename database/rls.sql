-- RLS e isolamento multi-tenant para o StudioFy
-- Executar via: psql -d <database> -f rls.sql

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Política: cada tenant vê/altera apenas seus registros
DROP POLICY IF EXISTS p_users_tenant ON users;
CREATE POLICY p_users_tenant ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS p_services_tenant ON services;
CREATE POLICY p_services_tenant ON services
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS p_customers_tenant ON customers;
CREATE POLICY p_customers_tenant ON customers
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS p_schedule_configs_tenant ON schedule_configs;
CREATE POLICY p_schedule_configs_tenant ON schedule_configs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

DROP POLICY IF EXISTS p_appointments_tenant ON appointments;
CREATE POLICY p_appointments_tenant ON appointments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
