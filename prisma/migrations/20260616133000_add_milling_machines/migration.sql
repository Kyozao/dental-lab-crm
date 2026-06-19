DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MillingMachineStatus'
  ) THEN
    CREATE TYPE "MillingMachineStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "milling_machines" (
  "id" UUID NOT NULL,
  "lab_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "serial_number" TEXT,
  "model" TEXT,
  "status" "MillingMachineStatus" NOT NULL DEFAULT 'ACTIVE',
  "status_reason" TEXT,
  "installed_at" TIMESTAMP(3),
  "removed_at" TIMESTAMP(3),
  "last_maintenance_at" TIMESTAMP(3),
  "next_maintenance_due_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "milling_machines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milling_machines_lab_id_fkey"
    FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "milling_machines_lab_id_name_key"
ON "milling_machines"("lab_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "milling_machines_lab_id_serial_number_key"
ON "milling_machines"("lab_id", "serial_number");

CREATE INDEX IF NOT EXISTS "milling_machines_lab_id_idx"
ON "milling_machines"("lab_id");

CREATE INDEX IF NOT EXISTS "milling_machines_status_idx"
ON "milling_machines"("status");

UPDATE "milling_drills"
SET "milling_machine_id" = NULL
WHERE "milling_machine_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "milling_machines"
    WHERE "milling_machines"."id" = "milling_drills"."milling_machine_id"
  );

ALTER TABLE "milling_drills"
DROP CONSTRAINT IF EXISTS "milling_drills_milling_machine_id_fkey";

ALTER TABLE "milling_drills"
ADD CONSTRAINT "milling_drills_milling_machine_id_fkey"
FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
