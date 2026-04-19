-- CreateEnum
CREATE TYPE "CaseScope" AS ENUM ('LAB', 'AGENCY');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "caseScope" "CaseScope" NOT NULL DEFAULT 'LAB';

-- CreateIndex
CREATE INDEX "Case_caseScope_idx" ON "Case"("caseScope");
