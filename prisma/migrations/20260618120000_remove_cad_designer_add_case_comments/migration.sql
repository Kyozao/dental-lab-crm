UPDATE "lab_members"
SET "role" = 'PRODUCTION'
WHERE "role" = 'CAD_DESIGNER';

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION');

ALTER TABLE "lab_members"
  ALTER COLUMN "role" TYPE "UserRole"
  USING "role"::text::"UserRole";

DROP TYPE "UserRole_old";

CREATE TABLE "case_comments" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "author_lab_member_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_user_id" UUID,

  CONSTRAINT "case_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_comments_case_id_created_at_idx" ON "case_comments"("case_id", "created_at");
CREATE INDEX "case_comments_author_user_id_idx" ON "case_comments"("author_user_id");
CREATE INDEX "case_comments_author_lab_member_id_idx" ON "case_comments"("author_lab_member_id");
CREATE INDEX "case_comments_deleted_by_user_id_idx" ON "case_comments"("deleted_by_user_id");

ALTER TABLE "case_comments"
  ADD CONSTRAINT "case_comments_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_comments"
  ADD CONSTRAINT "case_comments_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_comments"
  ADD CONSTRAINT "case_comments_author_lab_member_id_fkey"
  FOREIGN KEY ("author_lab_member_id") REFERENCES "lab_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_comments"
  ADD CONSTRAINT "case_comments_deleted_by_user_id_fkey"
  FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
