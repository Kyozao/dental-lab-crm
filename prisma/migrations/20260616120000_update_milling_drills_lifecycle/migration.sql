DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MillingDrillStatus'
  ) THEN
    CREATE TYPE "MillingDrillStatus" AS ENUM ('ACTIVE', 'STORED', 'RETIRED', 'LOST');
  END IF;
END $$;

ALTER TABLE "milling_drills"
ADD COLUMN "milling_machine_id" UUID,
ADD COLUMN "status" "MillingDrillStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "current_blocks_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "estimated_max_blocks" INTEGER,
ADD COLUMN "removed_at" TIMESTAMP(3);

UPDATE "milling_drills"
SET
  "status" = CASE
    WHEN COALESCE("is_active", true) = true AND "deleted_at" IS NULL THEN 'ACTIVE'::"MillingDrillStatus"
    ELSE 'RETIRED'::"MillingDrillStatus"
  END,
  "estimated_max_blocks" = "max_teeth_recommended",
  "removed_at" = COALESCE("changed_at", "deleted_at");

ALTER TABLE "milling_drills"
DROP COLUMN "type",
DROP COLUMN "brand",
DROP COLUMN "serial_number",
DROP COLUMN "max_teeth_recommended",
DROP COLUMN "changed_at",
DROP COLUMN "is_active",
DROP COLUMN "deleted_at";

ALTER TABLE "milling_drills"
ADD CONSTRAINT "milling_drills_current_blocks_count_nonnegative"
CHECK ("current_blocks_count" >= 0),
ADD CONSTRAINT "milling_drills_estimated_max_blocks_nonnegative"
CHECK ("estimated_max_blocks" IS NULL OR "estimated_max_blocks" >= 0),
ADD CONSTRAINT "milling_drills_removed_after_installed"
CHECK (
  "installed_at" IS NULL OR
  "removed_at" IS NULL OR
  "removed_at" >= "installed_at"
),
ADD CONSTRAINT "milling_drills_inactive_status_has_no_machine"
CHECK (
  "status" = 'ACTIVE' OR "milling_machine_id" IS NULL
);

CREATE INDEX IF NOT EXISTS "milling_drills_milling_machine_id_idx"
ON "milling_drills"("milling_machine_id");

CREATE INDEX IF NOT EXISTS "milling_drills_status_idx"
ON "milling_drills"("status");
