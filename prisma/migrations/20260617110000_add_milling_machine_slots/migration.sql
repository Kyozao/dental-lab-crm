CREATE TABLE IF NOT EXISTS "milling_machine_slots" (
  "id" UUID NOT NULL,
  "milling_machine_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "milling_machine_slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "milling_machine_slots_milling_machine_id_fkey"
    FOREIGN KEY ("milling_machine_id") REFERENCES "milling_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "milling_machine_slots_milling_machine_id_label_key"
ON "milling_machine_slots"("milling_machine_id", "label");

CREATE UNIQUE INDEX IF NOT EXISTS "milling_machine_slots_milling_machine_id_sort_order_key"
ON "milling_machine_slots"("milling_machine_id", "sort_order");

CREATE INDEX IF NOT EXISTS "milling_machine_slots_milling_machine_id_idx"
ON "milling_machine_slots"("milling_machine_id");

CREATE TABLE IF NOT EXISTS "case_milling_drill_slots" (
  "id" UUID NOT NULL,
  "milling_id" UUID NOT NULL,
  "milling_machine_slot_id" UUID,
  "milling_drill_id" UUID NOT NULL,
  "slot_label_snapshot" TEXT NOT NULL,
  "slot_order_snapshot" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_milling_drill_slots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "case_milling_drill_slots_milling_id_fkey"
    FOREIGN KEY ("milling_id") REFERENCES "case_millings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "case_milling_drill_slots_milling_machine_slot_id_fkey"
    FOREIGN KEY ("milling_machine_slot_id") REFERENCES "milling_machine_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "case_milling_drill_slots_milling_drill_id_fkey"
    FOREIGN KEY ("milling_drill_id") REFERENCES "milling_drills"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "case_milling_drill_slots_milling_id_slot_order_snapshot_key"
ON "case_milling_drill_slots"("milling_id", "slot_order_snapshot");

CREATE INDEX IF NOT EXISTS "case_milling_drill_slots_milling_id_idx"
ON "case_milling_drill_slots"("milling_id");

CREATE INDEX IF NOT EXISTS "case_milling_drill_slots_milling_machine_slot_id_idx"
ON "case_milling_drill_slots"("milling_machine_slot_id");

CREATE INDEX IF NOT EXISTS "case_milling_drill_slots_milling_drill_id_idx"
ON "case_milling_drill_slots"("milling_drill_id");
