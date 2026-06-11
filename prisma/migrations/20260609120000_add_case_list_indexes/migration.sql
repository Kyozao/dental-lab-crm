CREATE INDEX IF NOT EXISTS "cases_dentalLabId_createdAt_idx"
ON "cases"("dentalLabId", "createdAt");

CREATE INDEX IF NOT EXISTS "cases_dentalLabId_currentStatus_createdAt_idx"
ON "cases"("dentalLabId", "currentStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "cases_dentalLabId_clinicId_createdAt_idx"
ON "cases"("dentalLabId", "clinicId", "createdAt");
