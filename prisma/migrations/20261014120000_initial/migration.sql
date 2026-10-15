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
