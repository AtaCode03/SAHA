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
