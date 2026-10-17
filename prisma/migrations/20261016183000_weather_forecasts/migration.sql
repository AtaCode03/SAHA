CREATE TABLE "weather_forecasts" (
"id" TEXT NOT NULL,"fieldId" TEXT NOT NULL,"createdById" TEXT NOT NULL,"provider" TEXT NOT NULL,"adapterVersion" TEXT NOT NULL,"usageMode" TEXT NOT NULL,"requestedDate" TEXT NOT NULL,"inputHash" TEXT NOT NULL,"retrievedAt" TIMESTAMPTZ(3) NOT NULL,"issuedAt" TIMESTAMPTZ(3),"validFrom" TIMESTAMPTZ(3) NOT NULL,"validTo" TIMESTAMPTZ(3) NOT NULL,"payload" JSONB NOT NULL,CONSTRAINT "weather_forecasts_pkey" PRIMARY KEY ("id"),CONSTRAINT "weather_forecasts_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "weather_forecasts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "weather_forecasts_fieldId_requestedDate_retrievedAt_idx" ON "weather_forecasts"("fieldId","requestedDate","retrievedAt");
CREATE INDEX "weather_forecasts_inputHash_retrievedAt_idx" ON "weather_forecasts"("inputHash","retrievedAt");
ALTER TABLE "weather_forecasts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "weather_forecasts" FROM PUBLIC;
DO $acl$ DECLARE r text; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON "weather_forecasts" FROM %I',r); END IF; END LOOP; END $acl$;
