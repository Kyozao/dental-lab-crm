CREATE TABLE "case_thread_reads" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lab_member_id" UUID NOT NULL,
    "last_read_comment_id" UUID,
    "last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_thread_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_thread_reads_case_id_lab_member_id_key" ON "case_thread_reads"("case_id", "lab_member_id");
CREATE INDEX "case_thread_reads_user_id_idx" ON "case_thread_reads"("user_id");
CREATE INDEX "case_thread_reads_lab_member_id_idx" ON "case_thread_reads"("lab_member_id");
CREATE INDEX "case_thread_reads_last_read_comment_id_idx" ON "case_thread_reads"("last_read_comment_id");

ALTER TABLE "case_thread_reads"
ADD CONSTRAINT "case_thread_reads_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_thread_reads"
ADD CONSTRAINT "case_thread_reads_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_thread_reads"
ADD CONSTRAINT "case_thread_reads_lab_member_id_fkey"
FOREIGN KEY ("lab_member_id") REFERENCES "lab_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_thread_reads"
ADD CONSTRAINT "case_thread_reads_last_read_comment_id_fkey"
FOREIGN KEY ("last_read_comment_id") REFERENCES "case_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
