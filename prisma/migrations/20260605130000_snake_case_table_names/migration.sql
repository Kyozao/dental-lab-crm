DO $$
BEGIN
  IF to_regclass('clientcompanies') IS NOT NULL AND to_regclass('client_companies') IS NULL THEN
    ALTER TABLE clientcompanies RENAME TO client_companies;
  END IF;

  IF to_regclass('"ClientCompany"') IS NOT NULL AND to_regclass('client_companies') IS NULL THEN
    ALTER TABLE "ClientCompany" RENAME TO client_companies;
  END IF;

  IF to_regclass('"DentalLab"') IS NOT NULL AND to_regclass('dental_labs') IS NULL THEN
    ALTER TABLE "DentalLab" RENAME TO dental_labs;
  END IF;

  IF to_regclass('"LabCustomer"') IS NOT NULL AND to_regclass('lab_customers') IS NULL THEN
    ALTER TABLE "LabCustomer" RENAME TO lab_customers;
  END IF;

  IF to_regclass('"UserLabMembership"') IS NOT NULL AND to_regclass('user_lab_memberships') IS NULL THEN
    ALTER TABLE "UserLabMembership" RENAME TO user_lab_memberships;
  END IF;

  IF to_regclass('servicetypes') IS NOT NULL AND to_regclass('service_types') IS NULL THEN
    ALTER TABLE servicetypes RENAME TO service_types;
  END IF;

  IF to_regclass('"ServiceType"') IS NOT NULL AND to_regclass('service_types') IS NULL THEN
    ALTER TABLE "ServiceType" RENAME TO service_types;
  END IF;

  IF to_regclass('millingdrills') IS NOT NULL AND to_regclass('milling_drills') IS NULL THEN
    ALTER TABLE millingdrills RENAME TO milling_drills;
  END IF;

  IF to_regclass('"MillingDrill"') IS NOT NULL AND to_regclass('milling_drills') IS NULL THEN
    ALTER TABLE "MillingDrill" RENAME TO milling_drills;
  END IF;

  IF to_regclass('"CaseMilling"') IS NOT NULL AND to_regclass('case_millings') IS NULL THEN
    ALTER TABLE "CaseMilling" RENAME TO case_millings;
  END IF;

  IF to_regclass('caseattachments') IS NOT NULL AND to_regclass('case_attachments') IS NULL THEN
    ALTER TABLE caseattachments RENAME TO case_attachments;
  END IF;

  IF to_regclass('"CaseAttachment"') IS NOT NULL AND to_regclass('case_attachments') IS NULL THEN
    ALTER TABLE "CaseAttachment" RENAME TO case_attachments;
  END IF;

  IF to_regclass('"CaseComponentUsage"') IS NOT NULL AND to_regclass('case_component_usages') IS NULL THEN
    ALTER TABLE "CaseComponentUsage" RENAME TO case_component_usages;
  END IF;

  IF to_regclass('blocktypes') IS NOT NULL AND to_regclass('block_types') IS NULL THEN
    ALTER TABLE blocktypes RENAME TO block_types;
  END IF;

  IF to_regclass('"BlockType"') IS NOT NULL AND to_regclass('block_types') IS NULL THEN
    ALTER TABLE "BlockType" RENAME TO block_types;
  END IF;

  IF to_regclass('"CaseStatusHistory"') IS NOT NULL AND to_regclass('case_status_histories') IS NULL THEN
    ALTER TABLE "CaseStatusHistory" RENAME TO case_status_histories;
  END IF;

  IF to_regclass('"Notification"') IS NOT NULL AND to_regclass('notifications') IS NULL THEN
    ALTER TABLE "Notification" RENAME TO notifications;
  END IF;

  IF to_regclass('"PushSubscription"') IS NOT NULL AND to_regclass('push_subscriptions') IS NULL THEN
    ALTER TABLE "PushSubscription" RENAME TO push_subscriptions;
  END IF;
END $$;
