ALTER TABLE "labs"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL';

ALTER TABLE "service_types"
ADD COLUMN "base_price" DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE "cases"
ADD COLUMN "service_base_price_snapshot" DECIMAL(10, 2),
ADD COLUMN "case_price" DECIMAL(10, 2),
ADD COLUMN "is_price_overridden" BOOLEAN NOT NULL DEFAULT false;

UPDATE "cases" AS "case_item"
SET
  "service_base_price_snapshot" = "service_type"."base_price",
  "case_price" = "service_type"."base_price"
FROM "service_types" AS "service_type"
WHERE "case_item"."service_type_id" = "service_type"."id"
  AND "case_item"."case_price" IS NULL;
