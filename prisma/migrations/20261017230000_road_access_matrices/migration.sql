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
