DO $$
BEGIN
  IF to_regclass('"Case"') IS NOT NULL AND to_regclass('cases') IS NULL THEN
    ALTER TABLE "Case" RENAME TO cases;
  END IF;

  IF to_regclass('"Dentist"') IS NOT NULL AND to_regclass('dentists') IS NULL THEN
    ALTER TABLE "Dentist" RENAME TO dentists;
  END IF;

  IF to_regclass('"Clinic"') IS NOT NULL AND to_regclass('clinics') IS NULL THEN
    ALTER TABLE "Clinic" RENAME TO clinics;
  END IF;

  IF to_regclass('"Component"') IS NOT NULL AND to_regclass('components') IS NULL THEN
    ALTER TABLE "Component" RENAME TO components;
  END IF;

  IF to_regclass('"CaseAttachment"') IS NOT NULL AND to_regclass('caseattachments') IS NULL THEN
    ALTER TABLE "CaseAttachment" RENAME TO caseattachments;
  END IF;

  IF to_regclass('"BlockType"') IS NOT NULL AND to_regclass('blocktypes') IS NULL THEN
    ALTER TABLE "BlockType" RENAME TO blocktypes;
  END IF;

  IF to_regclass('"ClientCompany"') IS NOT NULL AND to_regclass('clientcompanies') IS NULL THEN
    ALTER TABLE "ClientCompany" RENAME TO clientcompanies;
  END IF;

  IF to_regclass('"MillingDrill"') IS NOT NULL AND to_regclass('millingdrills') IS NULL THEN
    ALTER TABLE "MillingDrill" RENAME TO millingdrills;
  END IF;

  IF to_regclass('"ServiceType"') IS NOT NULL AND to_regclass('servicetypes') IS NULL THEN
    ALTER TABLE "ServiceType" RENAME TO servicetypes;
  END IF;

  IF to_regclass('"User"') IS NOT NULL AND to_regclass('users') IS NULL THEN
    ALTER TABLE "User" RENAME TO users;
  END IF;
END $$;
