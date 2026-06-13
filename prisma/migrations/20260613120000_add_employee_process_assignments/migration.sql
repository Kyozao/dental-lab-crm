CREATE TABLE "employee_process_assignments" (
  "id" UUID NOT NULL,
  "lab_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "process_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_process_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_process_assignments_lab_id_user_id_process_id_key"
ON "employee_process_assignments"("lab_id", "user_id", "process_id");

CREATE INDEX "employee_process_assignments_lab_id_idx"
ON "employee_process_assignments"("lab_id");

CREATE INDEX "employee_process_assignments_user_id_idx"
ON "employee_process_assignments"("user_id");

CREATE INDEX "employee_process_assignments_process_id_idx"
ON "employee_process_assignments"("process_id");

ALTER TABLE "employee_process_assignments"
ADD CONSTRAINT "employee_process_assignments_lab_id_fkey"
FOREIGN KEY ("lab_id") REFERENCES "labs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_process_assignments"
ADD CONSTRAINT "employee_process_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_process_assignments"
ADD CONSTRAINT "employee_process_assignments_process_id_fkey"
FOREIGN KEY ("process_id") REFERENCES "processes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
