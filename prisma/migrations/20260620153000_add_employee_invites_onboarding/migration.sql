CREATE TABLE "employee_invites" (
    "id" UUID NOT NULL,
    "lab_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "auth_user_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "employee_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_invites_auth_user_id_key" ON "employee_invites"("auth_user_id");
CREATE INDEX "employee_invites_lab_id_created_at_idx" ON "employee_invites"("lab_id", "created_at");
CREATE UNIQUE INDEX "employee_invites_lab_id_email_key" ON "employee_invites"("lab_id", "email");

ALTER TABLE "employee_invites"
ADD CONSTRAINT "employee_invites_lab_id_fkey"
FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_invites"
ADD CONSTRAINT "employee_invites_invited_by_user_id_fkey"
FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
