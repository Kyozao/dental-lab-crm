ALTER TYPE "CaseStatus" RENAME TO "CaseStatus_old";

CREATE TYPE "CaseStatus" AS ENUM (
  'IN_PRODUCTION',
  'STANDBY',
  'DONE',
  'CANCELLED'
);

ALTER TABLE "cases"
  ALTER COLUMN "current_status" DROP DEFAULT;

ALTER TABLE "case_status_histories"
  ALTER COLUMN "from_status" TYPE "CaseStatus"
  USING (
    CASE
      WHEN "from_status" IS NULL THEN NULL
      WHEN "from_status"::text = 'DONE' THEN 'DONE'::"CaseStatus"
      ELSE 'IN_PRODUCTION'::"CaseStatus"
    END
  );

ALTER TABLE "case_status_histories"
  ALTER COLUMN "to_status" TYPE "CaseStatus"
  USING (
    CASE
      WHEN "to_status"::text = 'DONE' THEN 'DONE'::"CaseStatus"
      ELSE 'IN_PRODUCTION'::"CaseStatus"
    END
  );

ALTER TABLE "cases"
  ALTER COLUMN "current_status" TYPE "CaseStatus"
  USING (
    CASE
      WHEN "current_status"::text = 'DONE' THEN 'DONE'::"CaseStatus"
      ELSE 'IN_PRODUCTION'::"CaseStatus"
    END
  );

ALTER TABLE "cases"
  ALTER COLUMN "current_status" SET DEFAULT 'IN_PRODUCTION';

DROP TYPE "CaseStatus_old";

INSERT INTO "case_status_histories" (
  "id",
  "case_id",
  "from_status",
  "to_status",
  "note",
  "changed_at"
)
SELECT
  gen_random_uuid(),
  c."id",
  NULL,
  c."current_status",
  'Backfilled initial status.',
  c."created_at"
FROM "cases" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "case_status_histories" h
  WHERE h."case_id" = c."id"
);
