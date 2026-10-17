CREATE TABLE "price_items" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"unit" TEXT NOT NULL,"unitCost" DECIMAL(14,2) NOT NULL CHECK ("unitCost">=0),"active" BOOLEAN NOT NULL DEFAULT true,"version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "price_items_active_name_idx" ON "price_items"("active","name");
ALTER TABLE "appointment_requests" ADD COLUMN "pricingSnapshot" JSONB;
ALTER TABLE "price_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "price_items" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "price_items" FROM %I',r); END IF; END LOOP; END $acl$;
