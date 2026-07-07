ALTER TABLE "processes"
ADD COLUMN "default_labor_cost" DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE "employee_process_assignments"
ADD COLUMN "labor_cost_override" DECIMAL(10, 2);
