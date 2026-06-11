CREATE TYPE "CaseProcessStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'DONE', 'SKIPPED');

CREATE TABLE "processes" (
  "id" TEXT NOT NULL,
  "dentalLabId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_type_processes" (
  "id" TEXT NOT NULL,
  "serviceTypeId" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_type_processes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_processes" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "sourceProcessId" TEXT,
  "sourceServiceTypeProcessId" TEXT,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "status" "CaseProcessStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_processes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processes_dentalLabId_name_key" ON "processes"("dentalLabId", "name");
CREATE INDEX "processes_dentalLabId_idx" ON "processes"("dentalLabId");

CREATE UNIQUE INDEX "service_type_processes_serviceTypeId_sortOrder_key" ON "service_type_processes"("serviceTypeId", "sortOrder");
CREATE UNIQUE INDEX "service_type_processes_serviceTypeId_processId_key" ON "service_type_processes"("serviceTypeId", "processId");
CREATE INDEX "service_type_processes_processId_idx" ON "service_type_processes"("processId");

CREATE UNIQUE INDEX "case_processes_caseId_sortOrder_key" ON "case_processes"("caseId", "sortOrder");
CREATE INDEX "case_processes_caseId_idx" ON "case_processes"("caseId");
CREATE INDEX "case_processes_sourceProcessId_idx" ON "case_processes"("sourceProcessId");
CREATE INDEX "case_processes_sourceServiceTypeProcessId_idx" ON "case_processes"("sourceServiceTypeProcessId");
CREATE INDEX "case_processes_status_idx" ON "case_processes"("status");

ALTER TABLE "processes"
ADD CONSTRAINT "processes_dentalLabId_fkey"
FOREIGN KEY ("dentalLabId") REFERENCES "dental_labs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_type_processes"
ADD CONSTRAINT "service_type_processes_serviceTypeId_fkey"
FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_type_processes"
ADD CONSTRAINT "service_type_processes_processId_fkey"
FOREIGN KEY ("processId") REFERENCES "processes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "cases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_sourceProcessId_fkey"
FOREIGN KEY ("sourceProcessId") REFERENCES "processes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "case_processes"
ADD CONSTRAINT "case_processes_sourceServiceTypeProcessId_fkey"
FOREIGN KEY ("sourceServiceTypeProcessId") REFERENCES "service_type_processes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
