ALTER TABLE "service_types"
ADD COLUMN IF NOT EXISTS "workflowJson" JSONB NOT NULL DEFAULT '{"steps":[]}';

DO $$
BEGIN
  IF to_regclass('service_type_processes') IS NOT NULL THEN
    UPDATE "service_types" st
    SET "workflowJson" = jsonb_build_object(
      'steps',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', stp."processId",
              'processId', stp."processId",
              'dependsOn', '[]'::jsonb
            )
            ORDER BY stp."sortOrder"
          )
          FROM "service_type_processes" stp
          WHERE stp."serviceTypeId" = st."id"
        ),
        '[]'::jsonb
      )
    );
  END IF;
END $$;

CREATE TYPE "CaseProcessStatus_new" AS ENUM (
  'locked',
  'ready',
  'in_progress',
  'completed',
  'skipped',
  'cancelled'
);

ALTER TABLE "case_processes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "case_processes"
ALTER COLUMN "status" TYPE "CaseProcessStatus_new"
USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'locked'
    WHEN 'READY' THEN 'ready'
    WHEN 'IN_PROGRESS' THEN 'in_progress'
    WHEN 'DONE' THEN 'completed'
    WHEN 'SKIPPED' THEN 'skipped'
    ELSE 'locked'
  END
)::"CaseProcessStatus_new";

DROP TYPE "CaseProcessStatus";
ALTER TYPE "CaseProcessStatus_new" RENAME TO "CaseProcessStatus";
ALTER TABLE "case_processes" ALTER COLUMN "status" SET DEFAULT 'locked';

ALTER TABLE "case_processes"
ADD COLUMN IF NOT EXISTS "processId" TEXT,
ADD COLUMN IF NOT EXISTS "workflowStepId" TEXT,
ADD COLUMN IF NOT EXISTS "assignedToId" UUID;

UPDATE "case_processes"
SET
  "processId" = COALESCE("processId", "sourceProcessId"),
  "workflowStepId" = COALESCE("workflowStepId", "sourceProcessId", "id")
WHERE "processId" IS NULL OR "workflowStepId" IS NULL;

DELETE FROM "case_processes"
WHERE "processId" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'case_processes_sourceServiceTypeProcessId_fkey'
      AND conrelid = 'case_processes'::regclass
  ) THEN
    ALTER TABLE "case_processes" DROP CONSTRAINT "case_processes_sourceServiceTypeProcessId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'case_processes_sourceProcessId_fkey'
      AND conrelid = 'case_processes'::regclass
  ) THEN
    ALTER TABLE "case_processes" DROP CONSTRAINT "case_processes_sourceProcessId_fkey";
  END IF;
END $$;

DROP INDEX IF EXISTS "case_processes_caseId_sortOrder_key";
DROP INDEX IF EXISTS "case_processes_sourceProcessId_idx";
DROP INDEX IF EXISTS "case_processes_sourceServiceTypeProcessId_idx";

ALTER TABLE "case_processes"
DROP COLUMN IF EXISTS "sourceProcessId",
DROP COLUMN IF EXISTS "sourceServiceTypeProcessId",
DROP COLUMN IF EXISTS "name",
DROP COLUMN IF EXISTS "sortOrder",
DROP COLUMN IF EXISTS "notes";

ALTER TABLE "case_processes"
ALTER COLUMN "processId" SET NOT NULL,
ALTER COLUMN "workflowStepId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "case_processes_caseId_workflowStepId_key"
ON "case_processes"("caseId", "workflowStepId");

CREATE INDEX IF NOT EXISTS "case_processes_processId_idx"
ON "case_processes"("processId");

CREATE INDEX IF NOT EXISTS "case_processes_assignedToId_idx"
ON "case_processes"("assignedToId");

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_processId_fkey"
FOREIGN KEY ("processId") REFERENCES "processes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "case_process_dependencies" (
  "id" TEXT NOT NULL,
  "caseProcessId" TEXT NOT NULL,
  "dependsOnCaseProcessId" TEXT NOT NULL,

  CONSTRAINT "case_process_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "case_process_dependencies_caseProcessId_dependsOnCaseProcessId_key"
ON "case_process_dependencies"("caseProcessId", "dependsOnCaseProcessId");

CREATE INDEX IF NOT EXISTS "case_process_dependencies_caseProcessId_idx"
ON "case_process_dependencies"("caseProcessId");

CREATE INDEX IF NOT EXISTS "case_process_dependencies_dependsOnCaseProcessId_idx"
ON "case_process_dependencies"("dependsOnCaseProcessId");

ALTER TABLE "case_process_dependencies"
ADD CONSTRAINT "case_process_dependencies_caseProcessId_fkey"
FOREIGN KEY ("caseProcessId") REFERENCES "case_processes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_process_dependencies"
ADD CONSTRAINT "case_process_dependencies_dependsOnCaseProcessId_fkey"
FOREIGN KEY ("dependsOnCaseProcessId") REFERENCES "case_processes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "service_type_processes";
