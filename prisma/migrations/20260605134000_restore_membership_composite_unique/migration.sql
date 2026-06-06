DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_lab_memberships_userId_dentalLabId_key'
      AND conrelid = 'user_lab_memberships'::regclass
  ) THEN
    ALTER TABLE user_lab_memberships
    ADD CONSTRAINT "user_lab_memberships_userId_dentalLabId_key" UNIQUE ("userId", "dentalLabId");
  END IF;
END $$;
