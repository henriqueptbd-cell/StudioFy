import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export type TenantStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

// 1. Tenants (Estabelecimentos)
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/Sao_Paulo'),
    publicBookingUntil: date('public_booking_until', { mode: 'string' })
      .notNull()
      .default(sql`CURRENT_DATE + 30`),
    logoUrl: text('logo_url'),
    primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#000000'),
    status: varchar('status', { length: 20 }).$type<TenantStatus>().notNull().default('ACTIVE'),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('ck_tenants_platform_status', sql`${table.status} in ('ACTIVE', 'PAUSED', 'ARCHIVED')`),
    index('idx_tenants_platform_status_created').on(table.status, table.createdAt),
  ],
);

// Identidades globais da plataforma: sem tenant_id e sem cadastro público.
export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uk_platform_admins_email').on(sql`lower(${table.email})`)],
);

// Eventos append-only de suporte/gestão. Metadata contém campos alterados/status,
// nunca payload de clientes nem valores de credenciais.
export const platformAuditLogs = pgTable(
  'platform_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platformAdminId: uuid('platform_admin_id')
      .notNull()
      .references(() => platformAdmins.id, { onDelete: 'restrict' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 40 }).notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_platform_audit_tenant_created').on(table.tenantId, table.createdAt),
    index('idx_platform_audit_actor_created').on(table.platformAdminId, table.createdAt),
  ],
);

// 2. Users (Profissionais / Admins)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uk_users_tenant_email').on(table.tenantId, table.email)],
);

// 3. Services (Serviços)
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }),
  active: boolean('active').notNull().default(true),
});

// 4. Schedule Configs (Horários de Funcionamento)
export const scheduleConfigs = pgTable(
  'schedule_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    openTime: time('open_time').notNull(),
    closeTime: time('close_time').notNull(),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (table) => [uniqueIndex('uk_schedule_tenant_day').on(table.tenantId, table.dayOfWeek)],
);

// 5. Customers (Clientes)
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Sem unique(tenant_id, phone): um mesmo telefone pode pertencer a vários
    // clientes (nomes diferentes). Index não-único para acelerar buscas por
    // telefone na futura lista de contatos. A deduplicação (DISTINCT ON) será
    // feita na camada de consulta.
    index('idx_customers_tenant_phone').on(table.tenantId, table.phone),
  ],
);

// 6. Appointments (Agendamentos)
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    professionalId: uuid('professional_id').references(() => users.id, { onDelete: 'set null' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDENTE'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_appointments_tenant_time').on(table.tenantId, table.startTime, table.endTime),
    index('idx_appointments_tenant_status').on(table.tenantId, table.status, table.startTime),
  ],
);
