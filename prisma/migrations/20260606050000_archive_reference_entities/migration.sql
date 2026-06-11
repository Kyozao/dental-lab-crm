ALTER TABLE users
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE lab_customers
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE service_types
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE milling_drills
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE dentists
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE components
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE block_types
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE users SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE lab_customers SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE service_types SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE milling_drills SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE clinics SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE dentists SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE components SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE block_types SET "isActive" = true WHERE "isActive" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dentists_clinicId_fkey'
      AND conrelid = 'dentists'::regclass
  ) THEN
    ALTER TABLE dentists DROP CONSTRAINT "dentists_clinicId_fkey";
  END IF;

  ALTER TABLE dentists
  ADD CONSTRAINT "dentists_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES clinics(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_serviceTypeId_fkey'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT "cases_serviceTypeId_fkey";
  END IF;

  ALTER TABLE cases
  ADD CONSTRAINT "cases_serviceTypeId_fkey"
  FOREIGN KEY ("serviceTypeId") REFERENCES service_types(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_cadDesignerId_fkey'
      AND conrelid = 'cases'::regclass
  ) THEN
    ALTER TABLE cases DROP CONSTRAINT "cases_cadDesignerId_fkey";
  END IF;

  ALTER TABLE cases
  ADD CONSTRAINT "cases_cadDesignerId_fkey"
  FOREIGN KEY ("cadDesignerId") REFERENCES users(id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;
