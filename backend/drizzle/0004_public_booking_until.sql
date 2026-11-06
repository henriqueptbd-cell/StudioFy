ALTER TABLE "tenants" ADD COLUMN "public_booking_until" date;--> statement-breakpoint
UPDATE "tenants"
SET "public_booking_until" = (CURRENT_TIMESTAMP AT TIME ZONE "timezone")::date + 30;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "public_booking_until" SET DEFAULT (CURRENT_DATE + 30);--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "public_booking_until" SET NOT NULL;
