ALTER TABLE user_lab_memberships
ADD COLUMN IF NOT EXISTS role "UserRole";

UPDATE user_lab_memberships
SET role = users.role
FROM users
WHERE user_lab_memberships."userId" = users.id
  AND user_lab_memberships.role IS NULL;

ALTER TABLE user_lab_memberships
ALTER COLUMN role SET NOT NULL;

ALTER TABLE users
DROP COLUMN IF EXISTS role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_lab_memberships_userId_key'
      AND conrelid = 'user_lab_memberships'::regclass
  ) THEN
    ALTER TABLE user_lab_memberships
    ADD CONSTRAINT "user_lab_memberships_userId_key" UNIQUE ("userId");
  END IF;
END $$;
