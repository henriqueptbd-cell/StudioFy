-- Constraints de integridade: cliente, servico e profissional devem pertencer ao mesmo tenant
-- Constraints de integridade: cliente, servico e profissional devem pertencer ao mesmo tenant.
-- Os blocos DO tornam o script seguro para execucao repetida.
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS chk_appointments_customer_tenant,
  DROP CONSTRAINT IF EXISTS chk_appointments_service_tenant,
  DROP CONSTRAINT IF EXISTS chk_appointments_professional_tenant;

CREATE UNIQUE INDEX IF NOT EXISTS uk_customers_tenant_id ON customers (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_services_tenant_id ON services (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_tenant_id ON users (tenant_id, id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_customer_tenant') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_customer_tenant
      FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_service_tenant') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_service_tenant
      FOREIGN KEY (tenant_id, service_id) REFERENCES services (tenant_id, id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_professional_tenant') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_professional_tenant
      FOREIGN KEY (tenant_id, professional_id) REFERENCES users (tenant_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_services_duration_positive') THEN
    ALTER TABLE services ADD CONSTRAINT chk_services_duration_positive CHECK (duration_minutes > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_services_price_nonnegative') THEN
    ALTER TABLE services ADD CONSTRAINT chk_services_price_nonnegative CHECK (price IS NULL OR price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_schedule_day_valid') THEN
    ALTER TABLE schedule_configs ADD CONSTRAINT chk_schedule_day_valid CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointments_time_order') THEN
    ALTER TABLE appointments ADD CONSTRAINT chk_appointments_time_order CHECK (end_time > start_time);
  END IF;
END $$;

-- Funcao que verifica sobreposicao e integridade de tenant antes de inserir/atualizar
CREATE OR REPLACE FUNCTION check_appointment_conflict()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
  customer_tenant UUID;
  service_tenant UUID;
  professional_tenant UUID;
BEGIN
    -- Serializa verificacoes por tenant para evitar corrida entre duas insercoes.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text, 0));

  -- Verifica tenant do cliente
  SELECT tenant_id INTO customer_tenant FROM customers WHERE id = NEW.customer_id;
  IF customer_tenant IS NULL OR customer_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Cliente nao pertence ao tenant do agendamento';
  END IF;

  -- Verifica tenant do servico
  SELECT tenant_id INTO service_tenant FROM services WHERE id = NEW.service_id;
  IF service_tenant IS NULL OR service_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Servico nao pertence ao tenant do agendamento';
  END IF;

  -- Verifica tenant do profissional (se informado)
  IF NEW.professional_id IS NOT NULL THEN
    SELECT tenant_id INTO professional_tenant FROM users WHERE id = NEW.professional_id;
    IF professional_tenant IS NULL OR professional_tenant <> NEW.tenant_id THEN
      RAISE EXCEPTION 'Profissional nao pertence ao tenant do agendamento';
    END IF;
  END IF;

  -- Verifica sobreposicao apenas para PENDENTE e CONFIRMADO
  SELECT COUNT(*) INTO conflict_count
  FROM appointments a
  WHERE a.tenant_id = NEW.tenant_id
    AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND a.status IN ('PENDENTE', 'CONFIRMADO')
    AND a.start_time < NEW.end_time
    AND a.end_time > NEW.start_time;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Horario em conflito com outro agendamento';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger associado a tabela appointments
DROP TRIGGER IF EXISTS trg_appointment_conflict ON appointments;
CREATE TRIGGER trg_appointment_conflict
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_conflict();
