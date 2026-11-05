CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_admin_id" uuid NOT NULL,
	"tenant_id" uuid,
	"action" varchar(40) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_platform_admin_id_platform_admins_id_fk" FOREIGN KEY ("platform_admin_id") REFERENCES "public"."platform_admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_platform_admins_email" ON "platform_admins" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_platform_audit_tenant_created" ON "platform_audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_platform_audit_actor_created" ON "platform_audit_logs" USING btree ("platform_admin_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tenants_platform_status_created" ON "tenants" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "ck_tenants_platform_status" CHECK ("tenants"."status" in ('ACTIVE', 'PAUSED', 'ARCHIVED'));