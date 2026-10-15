-- SAHA: Supabase SQL Editor kurulumu. Kaynak: prisma/migrations.
-- Bu dosya veri/parola içermez. Mevcut kayıtları silmez veya güncellemez.
-- Tek transaction: hata olursa bütün kurulum geri alınır.
BEGIN;
CREATE SCHEMA IF NOT EXISTS "saha";
SET LOCAL search_path TO "saha", pg_catalog;
DO $saha_guard$
BEGIN
 IF to_regclass('saha._prisma_migrations') IS NULL AND EXISTS (
  SELECT 1 FROM pg_tables WHERE schemaname='saha'
 ) THEN
  RAISE EXCEPTION 'saha schemasinda Prisma gecmisi olmayan tablolar var; otomatik degisiklik yapilmadi.';
 END IF;
END $saha_guard$;
CREATE TABLE IF NOT EXISTS "saha"."_prisma_migrations" (
 "id" VARCHAR(36) PRIMARY KEY,
 "checksum" VARCHAR(64) NOT NULL,
 "finished_at" TIMESTAMPTZ,
 "migration_name" VARCHAR(255) NOT NULL,
 "logs" TEXT,
 "rolled_back_at" TIMESTAMPTZ,
 "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- Migration: 20261014120000_initial
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261014120000_initial' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'faa78fe9cfc33bbcd83414c355eca5515f1ae44b88fd2385377008a5dbe280c7') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261014120000_initial. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261014120000_initial' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='faa78fe9cfc33bbcd83414c355eca5515f1ae44b88fd2385377008a5dbe280c7') THEN
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('REQUESTED', 'PLANNED', 'RUNNING', 'COMPLETED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('REAL', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('PREPARATION', 'FLIGHT_START', 'FLIGHT_END', 'REFILL', 'BATTERY', 'WAIT_START', 'WAIT_END', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('TRANSPORT', 'ENERGY', 'LABOR', 'CONSUMABLE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "csrf" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" "Source" NOT NULL DEFAULT 'REAL',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'Konya',
    "district" TEXT NOT NULL DEFAULT 'Seydişehir',
    "neighborhood" TEXT NOT NULL,
    "block" TEXT,
    "parcel" TEXT,
    "area" DECIMAL(12,3) NOT NULL,
    "areaOrigin" TEXT NOT NULL DEFAULT 'OPERATOR_ESTIMATE',
    "crop" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "boundary" JSONB,
    "accessNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" "Source" NOT NULL DEFAULT 'REAL',

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tankLiters" DECIMAL(10,3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "drones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "operatorId" TEXT,
    "droneId" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plannedStart" TIMESTAMPTZ(3),
    "plannedEnd" TIMESTAMPTZ(3),
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "service" TEXT NOT NULL,
    "plannedArea" DECIMAL(12,3) NOT NULL,
    "agreedPrice" DECIMAL(14,2) NOT NULL,
    "adjustment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "notes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "source" "Source" NOT NULL DEFAULT 'REAL',

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'MEASURED',

    CONSTRAINT "operation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "kind" "ExpenseKind" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "allocationGroup" TEXT,
    "allocationRule" TEXT NOT NULL DEFAULT 'DIRECT',

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_snapshots" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "minutes" DECIMAL(12,3),
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_exports" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "manifest" JSONB NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_researchId_key" ON "customers"("researchId");

-- CreateIndex
CREATE INDEX "customers_active_name_idx" ON "customers"("active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fields_researchId_key" ON "fields"("researchId");

-- CreateIndex
CREATE INDEX "fields_customerId_active_idx" ON "fields"("customerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_researchId_key" ON "work_orders"("researchId");

-- CreateIndex
CREATE INDEX "work_orders_operatorId_status_plannedStart_idx" ON "work_orders"("operatorId", "status", "plannedStart");

-- CreateIndex
CREATE INDEX "work_orders_droneId_plannedStart_idx" ON "work_orders"("droneId", "plannedStart");

-- CreateIndex
CREATE INDEX "work_orders_status_completedAt_idx" ON "work_orders"("status", "completedAt");

-- CreateIndex
CREATE INDEX "operation_events_orderId_at_idx" ON "operation_events"("orderId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "operation_events_orderId_idempotencyKey_key" ON "operation_events"("orderId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "expenses_at_orderId_idx" ON "expenses"("at", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_orderId_at_idx" ON "payments"("orderId", "at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_at_idx" ON "audit_logs"("entity", "entityId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_droneId_fkey" FOREIGN KEY ("droneId") REFERENCES "drones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_events" ADD CONSTRAINT "operation_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_events" ADD CONSTRAINT "operation_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_snapshots" ADD CONSTRAINT "prediction_snapshots_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants at the storage boundary.
ALTER TABLE "fields" ADD CONSTRAINT "fields_positive_area" CHECK ("area" > 0);
ALTER TABLE "fields" ADD CONSTRAINT "fields_coordinates" CHECK (("latitude" IS NULL) = ("longitude" IS NULL) AND ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90) AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180));
ALTER TABLE "work_orders" ADD CONSTRAINT "orders_amounts" CHECK ("plannedArea" > 0 AND "agreedPrice" >= 0 AND "agreedPrice" + "adjustment" >= 0);
ALTER TABLE "work_orders" ADD CONSTRAINT "orders_time_range" CHECK (("plannedStart" IS NULL) = ("plannedEnd" IS NULL) AND ("plannedEnd" IS NULL OR "plannedEnd" > "plannedStart"));
ALTER TABLE "payments" ADD CONSTRAINT "payments_positive" CHECK ("amount" > 0);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_positive" CHECK ("amount" > 0);

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('9299b77b-6180-43cd-bab6-53150d0ae6e2','faa78fe9cfc33bbcd83414c355eca5515f1ae44b88fd2385377008a5dbe280c7','20261014120000_initial',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261014150000_actual_area
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261014150000_actual_area' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'c49060d2b9cba4d256ca2c6e7cd6f36ae160a1ec5a4c5c91047b1f4718db9746') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261014150000_actual_area. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261014150000_actual_area' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='c49060d2b9cba4d256ca2c6e7cd6f36ae160a1ec5a4c5c91047b1f4718db9746') THEN
ALTER TABLE "work_orders" ADD COLUMN "actualArea" DECIMAL(12,3), ADD COLUMN "actualAreaOrigin" TEXT;
ALTER TABLE "work_orders" ADD CONSTRAINT "orders_actual_area_positive" CHECK ("actualArea" IS NULL OR "actualArea" > 0);

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('55062069-f16c-4489-9a28-4cabcdeb8412','c49060d2b9cba4d256ca2c6e7cd6f36ae160a1ec5a4c5c91047b1f4718db9746','20261014150000_actual_area',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261015102000_optional_field_area
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261015102000_optional_field_area' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'b5d4050166d57ce5d241c685dbd3e0c5e652bb1fa8096c4624f04875ed782c48') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261015102000_optional_field_area. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261015102000_optional_field_area' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='b5d4050166d57ce5d241c685dbd3e0c5e652bb1fa8096c4624f04875ed782c48') THEN
ALTER TABLE "fields" ALTER COLUMN "area" DROP NOT NULL, ALTER COLUMN "areaOrigin" DROP NOT NULL, ALTER COLUMN "areaOrigin" DROP DEFAULT;


 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('39f3b944-38a3-4374-9049-1efcaa6938be','b5d4050166d57ce5d241c685dbd3e0c5e652bb1fa8096c4624f04875ed782c48','20261015102000_optional_field_area',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261015103000_optional_field_crop
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261015103000_optional_field_crop' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'13d3228449a471161ccedf8c346c0d6c21547670a7e5b50943b24fed1fd69d0c') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261015103000_optional_field_crop. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261015103000_optional_field_crop' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='13d3228449a471161ccedf8c346c0d6c21547670a7e5b50943b24fed1fd69d0c') THEN
ALTER TABLE "fields" ALTER COLUMN "crop" DROP NOT NULL;

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('bec8c6c0-2df0-4489-982f-c481697af5a9','13d3228449a471161ccedf8c346c0d6c21547670a7e5b50943b24fed1fd69d0c','20261015103000_optional_field_crop',now(),1);
 END IF;
END $saha_migration$;

-- Uygulama kendi Express oturum/rol denetimini kullanir.
-- Data API rollerine acik okuma/yazma politikasi eklenmez.
REVOKE ALL ON SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "saha" FROM PUBLIC, anon, authenticated, service_role;
DO $saha_rls$
DECLARE t RECORD;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='saha' LOOP
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY','saha',t.tablename);
 END LOOP;
END $saha_rls$;
COMMIT;

-- Basarili kurulumda 13 uygulama tablosu ve Prisma migration tablosu listelenir.
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='saha' ORDER BY tablename;
