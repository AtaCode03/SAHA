ALTER TABLE "work_orders" ADD COLUMN "actualArea" DECIMAL(12,3), ADD COLUMN "actualAreaOrigin" TEXT;
ALTER TABLE "work_orders" ADD CONSTRAINT "orders_actual_area_positive" CHECK ("actualArea" IS NULL OR "actualArea" > 0);
