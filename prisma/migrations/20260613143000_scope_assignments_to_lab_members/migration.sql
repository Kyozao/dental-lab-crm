ALTER TABLE "employee_process_assignments"
ADD COLUMN "lab_member_id" UUID;

UPDATE "employee_process_assignments" AS "assignment"
SET "lab_member_id" = "member"."id"
FROM "lab_members" AS "member"
WHERE "member"."lab_id" = "assignment"."lab_id"
  AND "member"."user_id" = "assignment"."user_id";

DELETE FROM "employee_process_assignments"
WHERE "lab_member_id" IS NULL;

DROP INDEX IF EXISTS "employee_process_assignments_lab_id_user_id_process_id_key";
DROP INDEX IF EXISTS "employee_process_assignments_user_id_idx";

ALTER TABLE "employee_process_assignments"
DROP CONSTRAINT IF EXISTS "employee_process_assignments_user_id_fkey";

ALTER TABLE "employee_process_assignments"
ALTER COLUMN "lab_member_id" SET NOT NULL,
DROP COLUMN "user_id";

CREATE UNIQUE INDEX "employee_process_assignments_lab_id_lab_member_id_process_id_key"
ON "employee_process_assignments"("lab_id", "lab_member_id", "process_id");

CREATE INDEX "employee_process_assignments_lab_member_id_idx"
ON "employee_process_assignments"("lab_member_id");

ALTER TABLE "employee_process_assignments"
ADD CONSTRAINT "employee_process_assignments_lab_member_id_fkey"
FOREIGN KEY ("lab_member_id") REFERENCES "lab_members"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD COLUMN "assigned_lab_member_id" UUID;

UPDATE "case_processes" AS "case_process"
SET "assigned_lab_member_id" = "member"."id"
FROM "cases" AS "case_item"
JOIN "lab_members" AS "member"
  ON "member"."lab_id" = "case_item"."lab_id"
WHERE "case_item"."id" = "case_process"."case_id"
  AND "member"."user_id" = "case_process"."assigned_to_id";

DROP INDEX IF EXISTS "case_processes_assignedToId_idx";
DROP INDEX IF EXISTS "case_processes_assigned_to_id_idx";

ALTER TABLE "case_processes"
DROP CONSTRAINT IF EXISTS "case_processes_assignedToId_fkey";
ALTER TABLE "case_processes"
DROP CONSTRAINT IF EXISTS "case_processes_assigned_to_id_fkey";

ALTER TABLE "case_processes"
DROP COLUMN "assigned_to_id";

CREATE INDEX "case_processes_assigned_lab_member_id_idx"
ON "case_processes"("assigned_lab_member_id");

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_assigned_lab_member_id_fkey"
FOREIGN KEY ("assigned_lab_member_id") REFERENCES "lab_members"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
