DROP INDEX IF EXISTS "cases_cadDesignerId_idx";
DROP INDEX IF EXISTS "cases_cad_designer_id_idx";

ALTER TABLE "cases"
DROP CONSTRAINT IF EXISTS "cases_cadDesignerId_fkey";
ALTER TABLE "cases"
DROP CONSTRAINT IF EXISTS "cases_cad_designer_id_fkey";

ALTER TABLE "cases"
DROP COLUMN IF EXISTS "cad_designer_id";
