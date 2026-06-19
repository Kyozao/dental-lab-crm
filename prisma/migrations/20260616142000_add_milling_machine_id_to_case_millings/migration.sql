ALTER TABLE "case_millings"
ADD COLUMN "milling_machine_id" UUID;

CREATE INDEX IF NOT EXISTS "case_millings_milling_machine_id_idx"
ON "case_millings"("milling_machine_id");

ALTER TABLE "case_millings"
DROP CONSTRAINT IF EXISTS "case_millings_milling_machine_id_fkey";

ALTER TABLE "case_millings"
ADD CONSTRAINT "case_millings_milling_machine_id_fkey"
FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
