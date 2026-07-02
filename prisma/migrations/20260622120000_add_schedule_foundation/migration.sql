DO $$
BEGIN
    CREATE TYPE "CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "CaseProcessSchedulingStatus" AS ENUM ('UNSCHEDULED', 'SCHEDULED', 'AT_RISK');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "ScheduleProposalStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "labs"
ADD COLUMN IF NOT EXISTS "schedule_revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "service_types" ADD COLUMN IF NOT EXISTS "delivery_buffer_days" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "employee_process_assignments" ADD COLUMN IF NOT EXISTS "productivity_points_per_hour" DECIMAL(10,2) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "milling_machines" ADD COLUMN IF NOT EXISTS "productivity_points_per_hour" DECIMAL(10,2) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "priority" "CasePriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "case_processes"
ADD COLUMN IF NOT EXISTS "planned_end_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "planned_milling_machine_id" UUID,
ADD COLUMN IF NOT EXISTS "planned_start_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "scheduling_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "scheduling_status" "CaseProcessSchedulingStatus" NOT NULL DEFAULT 'UNSCHEDULED',
ADD COLUMN IF NOT EXISTS "snapshot_dependency_lag_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "snapshot_expected_duration_days" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "snapshot_fixed_points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "snapshot_points_per_unit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "snapshot_requires_milling_machine" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "case_services" ADD COLUMN IF NOT EXISTS "delivery_buffer_days_snapshot" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "case_process_schedule_allocations" (
    "id" UUID NOT NULL,
    "case_process_id" UUID NOT NULL,
    "lab_member_id" UUID NOT NULL,
    "allocation_date" TIMESTAMP(3) NOT NULL,
    "planned_points" INTEGER NOT NULL,
    "milling_machine_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_process_schedule_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_schedule_shifts" (
    "id" UUID NOT NULL,
    "lab_member_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedule_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "employee_schedule_exceptions" (
    "id" UUID NOT NULL,
    "lab_member_id" UUID NOT NULL,
    "exception_date" TIMESTAMP(3) NOT NULL,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "is_available" BOOLEAN NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "milling_machine_schedule_shifts" (
    "id" UUID NOT NULL,
    "milling_machine_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milling_machine_schedule_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "milling_machine_schedule_exceptions" (
    "id" UUID NOT NULL,
    "milling_machine_id" UUID NOT NULL,
    "exception_date" TIMESTAMP(3) NOT NULL,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "is_available" BOOLEAN NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milling_machine_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "schedule_proposals" (
    "id" UUID NOT NULL,
    "lab_id" UUID NOT NULL,
    "status" "ScheduleProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "source_revision" INTEGER NOT NULL,
    "summary_json" JSONB NOT NULL,
    "changes_json" JSONB NOT NULL,
    "created_by_user_id" UUID,
    "approved_by_user_id" UUID,
    "rejected_by_user_id" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "case_process_schedule_allocations_lab_member_id_allocation__idx" ON "case_process_schedule_allocations"("lab_member_id", "allocation_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "case_process_schedule_allocations_milling_machine_id_alloca_idx" ON "case_process_schedule_allocations"("milling_machine_id", "allocation_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "case_process_schedule_allocations_case_process_id_allocatio_key" ON "case_process_schedule_allocations"("case_process_id", "allocation_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "employee_schedule_shifts_lab_member_id_day_of_week_idx" ON "employee_schedule_shifts"("lab_member_id", "day_of_week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "employee_schedule_exceptions_lab_member_id_exception_date_idx" ON "employee_schedule_exceptions"("lab_member_id", "exception_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "milling_machine_schedule_shifts_milling_machine_id_day_of_w_idx" ON "milling_machine_schedule_shifts"("milling_machine_id", "day_of_week");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "milling_machine_schedule_exceptions_milling_machine_id_exce_idx" ON "milling_machine_schedule_exceptions"("milling_machine_id", "exception_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "schedule_proposals_lab_id_status_created_at_idx" ON "schedule_proposals"("lab_id", "status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "case_processes_planned_milling_machine_id_idx" ON "case_processes"("planned_milling_machine_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "case_processes_planned_start_date_idx" ON "case_processes"("planned_start_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "case_processes_planned_end_date_idx" ON "case_processes"("planned_end_date");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "case_processes" ADD CONSTRAINT "case_processes_planned_milling_machine_id_fkey" FOREIGN KEY ("planned_milling_machine_id") REFERENCES "milling_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "case_process_schedule_allocations" ADD CONSTRAINT "case_process_schedule_allocations_case_process_id_fkey" FOREIGN KEY ("case_process_id") REFERENCES "case_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "case_process_schedule_allocations" ADD CONSTRAINT "case_process_schedule_allocations_lab_member_id_fkey" FOREIGN KEY ("lab_member_id") REFERENCES "lab_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "case_process_schedule_allocations" ADD CONSTRAINT "case_process_schedule_allocations_milling_machine_id_fkey" FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "employee_schedule_shifts" ADD CONSTRAINT "employee_schedule_shifts_lab_member_id_fkey" FOREIGN KEY ("lab_member_id") REFERENCES "lab_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "employee_schedule_exceptions" ADD CONSTRAINT "employee_schedule_exceptions_lab_member_id_fkey" FOREIGN KEY ("lab_member_id") REFERENCES "lab_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "milling_machine_schedule_shifts" ADD CONSTRAINT "milling_machine_schedule_shifts_milling_machine_id_fkey" FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "milling_machine_schedule_exceptions" ADD CONSTRAINT "milling_machine_schedule_exceptions_milling_machine_id_fkey" FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "schedule_proposals" ADD CONSTRAINT "schedule_proposals_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "schedule_proposals" ADD CONSTRAINT "schedule_proposals_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "schedule_proposals" ADD CONSTRAINT "schedule_proposals_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "schedule_proposals" ADD CONSTRAINT "schedule_proposals_rejected_by_user_id_fkey" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
