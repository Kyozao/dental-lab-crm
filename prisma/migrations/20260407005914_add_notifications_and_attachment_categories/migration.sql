-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('SCAN_INPUT', 'DESIGN_OUTPUT', 'MODEL_OUTPUT', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CASE_ASSIGNED', 'SCAN_UPLOADED', 'DESIGN_UPLOADED', 'CASE_STATUS_CHANGED');

-- DropIndex
DROP INDEX "CaseAttachment_caseId_createdAt_idx";

-- AlterTable
ALTER TABLE "CaseAttachment" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "retentionUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "caseId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_createdAt_idx" ON "Notification"("recipientUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_caseId_idx" ON "Notification"("caseId");

-- CreateIndex
CREATE INDEX "CaseAttachment_caseId_kind_createdAt_idx" ON "CaseAttachment"("caseId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
