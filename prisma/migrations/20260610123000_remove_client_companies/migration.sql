ALTER TABLE "users"
DROP COLUMN IF EXISTS "client_company_id";

ALTER TABLE "labs"
DROP COLUMN IF EXISTS "client_company_id";

DROP TABLE IF EXISTS "client_companies";
