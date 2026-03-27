-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ENTRY', 'WAITING_INFO', 'DESIGNING', 'WAITING_APPROVAL', 'MILLING_PRINTING', 'DONE');

-- CreateEnum
CREATE TYPE "MillingStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'CAD_DESIGNER', 'PRODUCTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MillingDrill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "brand" TEXT,
    "serialNumber" TEXT,
    "maxTeethRecommended" INTEGER,
    "installedAt" TIMESTAMP(3),
    "changedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MillingDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMilling" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "blockTypeId" TEXT NOT NULL,
    "millingDrillId" TEXT,
    "redoneFromMillingId" TEXT,
    "status" "MillingStatus" NOT NULL DEFAULT 'SUCCESS',
    "teethMilledQty" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "notes" TEXT,
    "milledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseMilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dentist" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dentist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "defaultCost" DECIMAL(10,2),
    "defaultPrice" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseComponentUsage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "chargeClient" BOOLEAN NOT NULL DEFAULT true,
    "unitCost" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseComponentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "shade" TEXT,
    "defaultCost" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientCaseCode" TEXT,
    "patientName" TEXT NOT NULL,
    "clinicId" TEXT,
    "serviceTypeId" TEXT,
    "dentistId" TEXT,
    "cadDesignerId" TEXT,
    "createdByUserId" TEXT,
    "currentStatus" "CaseStatus" NOT NULL DEFAULT 'ENTRY',
    "teeth" TEXT,
    "shade" TEXT,
    "dueDate" TIMESTAMP(3),
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "pendingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "userId" TEXT,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceType_name_key" ON "ServiceType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MillingDrill_serialNumber_key" ON "MillingDrill"("serialNumber");

-- CreateIndex
CREATE INDEX "CaseMilling_caseId_idx" ON "CaseMilling"("caseId");

-- CreateIndex
CREATE INDEX "CaseMilling_blockTypeId_idx" ON "CaseMilling"("blockTypeId");

-- CreateIndex
CREATE INDEX "CaseMilling_millingDrillId_idx" ON "CaseMilling"("millingDrillId");

-- CreateIndex
CREATE INDEX "CaseMilling_redoneFromMillingId_idx" ON "CaseMilling"("redoneFromMillingId");

-- CreateIndex
CREATE INDEX "CaseMilling_status_idx" ON "CaseMilling"("status");

-- CreateIndex
CREATE INDEX "CaseComponentUsage_caseId_idx" ON "CaseComponentUsage"("caseId");

-- CreateIndex
CREATE INDEX "CaseComponentUsage_componentId_idx" ON "CaseComponentUsage"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_code_key" ON "Case"("code");

-- CreateIndex
CREATE INDEX "Case_clinicId_idx" ON "Case"("clinicId");

-- CreateIndex
CREATE INDEX "Case_dentistId_idx" ON "Case"("dentistId");

-- CreateIndex
CREATE INDEX "Case_currentStatus_idx" ON "Case"("currentStatus");

-- CreateIndex
CREATE INDEX "Case_serviceTypeId_idx" ON "Case"("serviceTypeId");

-- CreateIndex
CREATE INDEX "Case_cadDesignerId_idx" ON "Case"("cadDesignerId");

-- CreateIndex
CREATE INDEX "Case_createdByUserId_idx" ON "Case"("createdByUserId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_idx" ON "CaseStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_toStatus_idx" ON "CaseStatusHistory"("toStatus");

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_blockTypeId_fkey" FOREIGN KEY ("blockTypeId") REFERENCES "BlockType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_millingDrillId_fkey" FOREIGN KEY ("millingDrillId") REFERENCES "MillingDrill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_redoneFromMillingId_fkey" FOREIGN KEY ("redoneFromMillingId") REFERENCES "CaseMilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dentist" ADD CONSTRAINT "Dentist_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComponentUsage" ADD CONSTRAINT "CaseComponentUsage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseComponentUsage" ADD CONSTRAINT "CaseComponentUsage_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_cadDesignerId_fkey" FOREIGN KEY ("cadDesignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
