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
 VALUES ('41817099-bcdd-4efc-9532-15912acc8bfb','faa78fe9cfc33bbcd83414c355eca5515f1ae44b88fd2385377008a5dbe280c7','20261014120000_initial',now(),1);
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
 VALUES ('557dd69b-88d7-444b-8817-edac67fcbf73','c49060d2b9cba4d256ca2c6e7cd6f36ae160a1ec5a4c5c91047b1f4718db9746','20261014150000_actual_area',now(),1);
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
 VALUES ('fcd418bb-2309-4d20-92a4-02415159d9c0','b5d4050166d57ce5d241c685dbd3e0c5e652bb1fa8096c4624f04875ed782c48','20261015102000_optional_field_area',now(),1);
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
 VALUES ('8b27e887-985a-4608-931f-b467cfbedd31','13d3228449a471161ccedf8c346c0d6c21547670a7e5b50943b24fed1fd69d0c','20261015103000_optional_field_crop',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261016183000_weather_forecasts
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261016183000_weather_forecasts' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'7e302ba4b6c65043be38193e77219d45bebc5fa482b43c32d5fe220f8448ef3b') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261016183000_weather_forecasts. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261016183000_weather_forecasts' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='7e302ba4b6c65043be38193e77219d45bebc5fa482b43c32d5fe220f8448ef3b') THEN
CREATE TABLE "weather_forecasts" (
"id" TEXT NOT NULL,"fieldId" TEXT NOT NULL,"createdById" TEXT NOT NULL,"provider" TEXT NOT NULL,"adapterVersion" TEXT NOT NULL,"usageMode" TEXT NOT NULL,"requestedDate" TEXT NOT NULL,"inputHash" TEXT NOT NULL,"retrievedAt" TIMESTAMPTZ(3) NOT NULL,"issuedAt" TIMESTAMPTZ(3),"validFrom" TIMESTAMPTZ(3) NOT NULL,"validTo" TIMESTAMPTZ(3) NOT NULL,"payload" JSONB NOT NULL,CONSTRAINT "weather_forecasts_pkey" PRIMARY KEY ("id"),CONSTRAINT "weather_forecasts_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "weather_forecasts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "weather_forecasts_fieldId_requestedDate_retrievedAt_idx" ON "weather_forecasts"("fieldId","requestedDate","retrievedAt");
CREATE INDEX "weather_forecasts_inputHash_retrievedAt_idx" ON "weather_forecasts"("inputHash","retrievedAt");
ALTER TABLE "weather_forecasts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "weather_forecasts" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "weather_forecasts" FROM %I',r); END IF; END LOOP; END $acl$;

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('69577a2b-2eff-4d57-9b53-e751bc9177a8','7e302ba4b6c65043be38193e77219d45bebc5fa482b43c32d5fe220f8448ef3b','20261016183000_weather_forecasts',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261016210000_appointments_planning
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261016210000_appointments_planning' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'0095d34e7c9b11d313195bb4ffd2394e24af022f3222488a6724b3d80ab59c82') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261016210000_appointments_planning. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261016210000_appointments_planning' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='0095d34e7c9b11d313195bb4ffd2394e24af022f3222488a6724b3d80ab59c82') THEN
CREATE TABLE "planning_profiles" (
"id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"operatorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"droneId" TEXT NOT NULL REFERENCES "drones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"service" TEXT NOT NULL,"preparationMinutes" DECIMAL(10,3) NOT NULL,"minutesPerDekar" DECIMAL(10,3) NOT NULL,"closingMinutes" DECIMAL(10,3) NOT NULL,"coefficientSource" TEXT NOT NULL,"shiftStart" TEXT NOT NULL,"shiftEnd" TEXT NOT NULL,"baseName" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "planning_profiles" ADD COLUMN "weatherPolicy" JSONB;
CREATE TABLE "appointment_requests" (
"id" TEXT PRIMARY KEY,"fieldId" TEXT NOT NULL REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"service" TEXT NOT NULL,"requestedDay" TEXT NOT NULL,"earliestDay" TEXT NOT NULL,"latestDay" TEXT NOT NULL,"windows" JSONB NOT NULL,"scope" TEXT NOT NULL DEFAULT 'FULL_PARCEL',"agreedPrice" DECIMAL(14,2) NOT NULL,"status" TEXT NOT NULL DEFAULT 'PENDING',"revision" INTEGER NOT NULL DEFAULT 1,"orderId" TEXT UNIQUE REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"source" "Source" NOT NULL DEFAULT 'REAL',"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "appointment_requests_status_earliestDay_latestDay_idx" ON "appointment_requests"("status","earliestDay","latestDay");
CREATE INDEX "appointment_requests_fieldId_idx" ON "appointment_requests"("fieldId");
CREATE TABLE "daily_plans" (
"id" TEXT PRIMARY KEY,"day" TEXT NOT NULL,"createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"input" JSONB NOT NULL,"result" JSONB NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"approvedAt" TIMESTAMPTZ(3));
CREATE INDEX "daily_plans_day_status_idx" ON "daily_plans"("day","status");
ALTER TABLE "planning_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_plans" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "planning_profiles","appointment_requests","daily_plans" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "planning_profiles","appointment_requests","daily_plans" FROM %I',r); END IF; END LOOP; END $acl$;

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('5a04f248-65ae-4574-9d7d-9c330f77143e','0095d34e7c9b11d313195bb4ffd2394e24af022f3222488a6724b3d80ab59c82','20261016210000_appointments_planning',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261017230000_road_access_matrices
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261017230000_road_access_matrices' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'2b3b717dad789312fe0d2a0e5980853b271a8951ffe9f362c066e03e3317ac9d') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261017230000_road_access_matrices. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261017230000_road_access_matrices' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='2b3b717dad789312fe0d2a0e5980853b271a8951ffe9f362c066e03e3317ac9d') THEN
ALTER TABLE "fields" ADD COLUMN "roadAccess" JSONB;
ALTER TABLE "planning_profiles" ADD COLUMN "baseLocation" JSONB;
CREATE TABLE "travel_matrices" (
"id" TEXT PRIMARY KEY,"profileId" TEXT NOT NULL REFERENCES "planning_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"inputHash" TEXT NOT NULL,"input" JSONB NOT NULL,"payload" JSONB NOT NULL,"retrievedAt" TIMESTAMPTZ(3) NOT NULL,"expiresAt" TIMESTAMPTZ(3) NOT NULL);
CREATE INDEX "travel_matrices_profileId_inputHash_retrievedAt_idx" ON "travel_matrices"("profileId","inputHash","retrievedAt");
CREATE TABLE "travel_routes" (
"id" TEXT PRIMARY KEY,"planId" TEXT NOT NULL REFERENCES "daily_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"profileId" TEXT NOT NULL,"payload" JSONB NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "travel_routes_planId_profileId_key" ON "travel_routes"("planId","profileId");
ALTER TABLE "travel_routes" ADD COLUMN "createdById" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "travel_routes" ADD CONSTRAINT "travel_routes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "planning_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "travel_matrices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "travel_routes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "travel_matrices","travel_routes" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "travel_matrices","travel_routes" FROM %I',r); END IF; END LOOP; END $acl$;

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('b8313363-adc4-4113-8b21-60805e9194b2','2b3b717dad789312fe0d2a0e5980853b271a8951ffe9f362c066e03e3317ac9d','20261017230000_road_access_matrices',now(),1);
 END IF;
END $saha_migration$;

-- Migration: 20261018010000_pricing
DO $saha_migration$
BEGIN
 IF EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261018010000_pricing' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum<>'9522061edff149985014b9c11b080408d12cbe9b80f25cfe28119bcb45ed8a25') THEN
  RAISE EXCEPTION 'Migration checksum farkli: 20261018010000_pricing. Mevcut veri korundu.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM "saha"."_prisma_migrations" WHERE migration_name='20261018010000_pricing' AND rolled_back_at IS NULL AND finished_at IS NOT NULL AND checksum='9522061edff149985014b9c11b080408d12cbe9b80f25cfe28119bcb45ed8a25') THEN
CREATE TABLE "price_items" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"unit" TEXT NOT NULL,"unitCost" DECIMAL(14,2) NOT NULL CHECK ("unitCost">=0),"active" BOOLEAN NOT NULL DEFAULT true,"version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "price_items_active_name_idx" ON "price_items"("active","name");
ALTER TABLE "appointment_requests" ADD COLUMN "pricingSnapshot" JSONB;
ALTER TABLE "price_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "price_items" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "price_items" FROM %I',r); END IF; END LOOP; END $acl$;

 INSERT INTO "saha"."_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count)
 VALUES ('27c7ed42-53b1-42b7-857d-442248803cad','9522061edff149985014b9c11b080408d12cbe9b80f25cfe28119bcb45ed8a25','20261018010000_pricing',now(),1);
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
