ALTER TABLE "case_processes"
  RENAME COLUMN "snapshot_fixed_points" TO "snapshot_fixed_minutes";

ALTER TABLE "case_processes"
  RENAME COLUMN "snapshot_points_per_unit" TO "snapshot_minutes_per_unit";

ALTER TABLE "case_process_schedule_allocations"
  RENAME COLUMN "planned_points" TO "planned_minutes";

ALTER TABLE "employee_schedule_shifts"
  ADD COLUMN "available_minutes" INTEGER NOT NULL DEFAULT 0;

UPDATE "employee_schedule_shifts"
SET "available_minutes" = CASE
  WHEN "is_active" THEN GREATEST(0, "end_minute" - "start_minute")
  ELSE 0
END;

ALTER TABLE "employee_schedule_shifts"
  DROP COLUMN "start_minute",
  DROP COLUMN "end_minute",
  DROP COLUMN "is_active";

ALTER TABLE "employee_schedule_shifts"
  ADD CONSTRAINT "employee_schedule_shifts_lab_member_id_day_of_week_key"
  UNIQUE ("lab_member_id", "day_of_week");

ALTER TABLE "employee_schedule_exceptions"
  ADD COLUMN "available_minutes" INTEGER NOT NULL DEFAULT 0;

UPDATE "employee_schedule_exceptions"
SET "available_minutes" = CASE
  WHEN "is_available" THEN GREATEST(0, COALESCE("end_minute", 0) - COALESCE("start_minute", 0))
  ELSE 0
END;

ALTER TABLE "employee_schedule_exceptions"
  DROP COLUMN "start_minute",
  DROP COLUMN "end_minute",
  DROP COLUMN "is_available";
