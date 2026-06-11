DO $$
BEGIN
  IF to_regclass('public.clinics') IS NOT NULL
     AND to_regclass('public.customers') IS NULL THEN
    ALTER TABLE "clinics" RENAME TO "customers";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dentists'
      AND column_name = 'clinic_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dentists'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE "dentists" RENAME COLUMN "clinic_id" TO "customer_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cases'
      AND column_name = 'clinic_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cases'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE "cases" RENAME COLUMN "clinic_id" TO "customer_id";
  END IF;

  IF to_regclass('public.clinics_lab_id_idx') IS NOT NULL
     AND to_regclass('public.customers_lab_id_idx') IS NULL THEN
    ALTER INDEX "clinics_lab_id_idx" RENAME TO "customers_lab_id_idx";
  END IF;

  IF to_regclass('public.dentists_clinic_id_idx') IS NOT NULL
     AND to_regclass('public.dentists_customer_id_idx') IS NULL THEN
    ALTER INDEX "dentists_clinic_id_idx" RENAME TO "dentists_customer_id_idx";
  END IF;

  IF to_regclass('public.cases_clinic_id_idx') IS NOT NULL
     AND to_regclass('public.cases_customer_id_idx') IS NULL THEN
    ALTER INDEX "cases_clinic_id_idx" RENAME TO "cases_customer_id_idx";
  END IF;

  IF to_regclass('public.cases_lab_id_clinic_id_created_at_idx') IS NOT NULL
     AND to_regclass('public.cases_lab_id_customer_id_created_at_idx') IS NULL THEN
    ALTER INDEX "cases_lab_id_clinic_id_created_at_idx" RENAME TO "cases_lab_id_customer_id_created_at_idx";
  END IF;
END $$;
