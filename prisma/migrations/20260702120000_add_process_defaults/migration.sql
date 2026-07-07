ALTER TABLE "processes"
ADD COLUMN "default_fixed_minutes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "default_expected_duration_days" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "default_requires_milling_machine" BOOLEAN NOT NULL DEFAULT false;
