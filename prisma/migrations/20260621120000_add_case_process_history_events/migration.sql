CREATE TYPE "CaseProcessHistoryEventType" AS ENUM ('STARTED', 'COMPLETED');

CREATE TABLE "case_process_history_events" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "case_process_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "event_type" "CaseProcessHistoryEventType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_process_history_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_process_history_events_case_id_created_at_idx"
ON "case_process_history_events"("case_id", "created_at");

CREATE INDEX "case_process_history_events_case_process_id_created_at_idx"
ON "case_process_history_events"("case_process_id", "created_at");

CREATE INDEX "case_process_history_events_actor_user_id_idx"
ON "case_process_history_events"("actor_user_id");

ALTER TABLE "case_process_history_events"
ADD CONSTRAINT "case_process_history_events_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_process_history_events"
ADD CONSTRAINT "case_process_history_events_case_process_id_fkey"
FOREIGN KEY ("case_process_id") REFERENCES "case_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_process_history_events"
ADD CONSTRAINT "case_process_history_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
