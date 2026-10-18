ALTER TABLE "work_orders" ADD COLUMN "dueDay" TEXT, ADD COLUMN "creditNote" TEXT;
CREATE TABLE "customer_receipts" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"amount" NUMERIC(14,2) NOT NULL CHECK ("amount">=0),"method" TEXT NOT NULL,"at" TIMESTAMPTZ(3) NOT NULL,"note" TEXT,"idempotencyKey" TEXT NOT NULL UNIQUE,"requestHash" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1);
CREATE INDEX "customer_receipts_customerId_at_idx" ON "customer_receipts"("customerId","at");
ALTER TABLE "payments" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'LEGACY', ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "receiptId" TEXT REFERENCES "customer_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "payments_receiptId_idx" ON "payments"("receiptId");
CREATE INDEX "work_orders_customerId_status_completedAt_idx" ON "work_orders"("customerId","status","completedAt");
ALTER TABLE "customer_receipts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "customer_receipts" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "customer_receipts" FROM %I',r); END IF; END LOOP; END $acl$;
