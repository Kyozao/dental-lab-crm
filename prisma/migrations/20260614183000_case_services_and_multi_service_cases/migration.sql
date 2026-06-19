CREATE TABLE "case_services" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "service_type_id" UUID NOT NULL,
  "service_name_snapshot" TEXT NOT NULL,
  "service_base_price_snapshot" DECIMAL(10,2) NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "is_unit_price_overridden" BOOLEAN NOT NULL DEFAULT false,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_services_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "case_processes"
ADD COLUMN "case_service_id" UUID;

INSERT INTO "case_services" (
  "id",
  "case_id",
  "service_type_id",
  "service_name_snapshot",
  "service_base_price_snapshot",
  "unit_price",
  "is_unit_price_overridden",
  "quantity",
  "created_at",
  "updated_at"
)
SELECT
  "cases"."id",
  "cases"."id",
  "cases"."service_type_id",
  COALESCE("service_types"."name", 'Unknown service'),
  COALESCE("cases"."service_base_price_snapshot", "service_types"."base_price", 0),
  COALESCE("cases"."case_price", "cases"."service_base_price_snapshot", "service_types"."base_price", 0),
  COALESCE("cases"."is_price_overridden", false),
  1,
  "cases"."created_at",
  "cases"."updated_at"
FROM "cases"
INNER JOIN "service_types"
  ON "service_types"."id" = "cases"."service_type_id"
WHERE "cases"."service_type_id" IS NOT NULL;

UPDATE "case_processes"
SET "case_service_id" = "case_id"
WHERE "case_service_id" IS NULL;

ALTER TABLE "case_processes"
ALTER COLUMN "case_service_id" SET NOT NULL;

DROP INDEX IF EXISTS "case_processes_caseId_workflowStepId_key";

CREATE INDEX "case_services_case_id_idx"
ON "case_services"("case_id");

CREATE INDEX "case_services_service_type_id_idx"
ON "case_services"("service_type_id");

CREATE INDEX "case_processes_case_service_id_idx"
ON "case_processes"("case_service_id");

CREATE UNIQUE INDEX "case_processes_case_service_id_workflow_step_id_key"
ON "case_processes"("case_service_id", "workflow_step_id");

ALTER TABLE "case_services"
ADD CONSTRAINT "case_services_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "cases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_services"
ADD CONSTRAINT "case_services_service_type_id_fkey"
FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_case_service_id_fkey"
FOREIGN KEY ("case_service_id") REFERENCES "case_services"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
