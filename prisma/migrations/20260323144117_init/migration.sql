-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "elementsQty" INTEGER;

-- CreateTable
CREATE TABLE "CaseAttachment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseAttachment_caseId_createdAt_idx" ON "CaseAttachment"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
