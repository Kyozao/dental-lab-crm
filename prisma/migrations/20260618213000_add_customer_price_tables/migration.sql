ALTER TABLE "customers"
ADD COLUMN "price_table_id" UUID;

CREATE TABLE "price_tables" (
  "id" UUID NOT NULL,
  "lab_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_table_service_prices" (
  "id" UUID NOT NULL,
  "price_table_id" UUID NOT NULL,
  "service_type_id" UUID NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_table_service_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "price_tables_lab_id_idx" ON "price_tables"("lab_id");
CREATE INDEX "price_tables_lab_id_name_idx" ON "price_tables"("lab_id", "name");
CREATE UNIQUE INDEX "price_tables_active_lab_id_name_key"
ON "price_tables"("lab_id", "name")
WHERE "deleted_at" IS NULL AND "is_active" = true;

CREATE INDEX "price_table_service_prices_price_table_id_idx"
ON "price_table_service_prices"("price_table_id");
CREATE INDEX "price_table_service_prices_service_type_id_idx"
ON "price_table_service_prices"("service_type_id");
CREATE UNIQUE INDEX "price_table_service_prices_price_table_id_service_type_id_key"
ON "price_table_service_prices"("price_table_id", "service_type_id");

CREATE INDEX "customers_price_table_id_idx" ON "customers"("price_table_id");

ALTER TABLE "price_tables"
ADD CONSTRAINT "price_tables_lab_id_fkey"
FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_table_service_prices"
ADD CONSTRAINT "price_table_service_prices_price_table_id_fkey"
FOREIGN KEY ("price_table_id") REFERENCES "price_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "price_table_service_prices"
ADD CONSTRAINT "price_table_service_prices_service_type_id_fkey"
FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customers"
ADD CONSTRAINT "customers_price_table_id_fkey"
FOREIGN KEY ("price_table_id") REFERENCES "price_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
