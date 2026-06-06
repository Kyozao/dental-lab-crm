DO $$
BEGIN
  IF to_regclass('"BlockTypes"') IS NOT NULL AND to_regclass('blocktypes') IS NULL THEN
    ALTER TABLE "BlockTypes" RENAME TO blocktypes;
  END IF;

  IF to_regclass('"ClientCompanies"') IS NOT NULL AND to_regclass('clientcompanies') IS NULL THEN
    ALTER TABLE "ClientCompanies" RENAME TO clientcompanies;
  END IF;

  IF to_regclass('"ServiceTypes"') IS NOT NULL AND to_regclass('servicetypes') IS NULL THEN
    ALTER TABLE "ServiceTypes" RENAME TO servicetypes;
  END IF;

  IF to_regclass('"Users"') IS NOT NULL AND to_regclass('users') IS NULL THEN
    ALTER TABLE "Users" RENAME TO users;
  END IF;
END $$;
