/*
  Warnings:

  - You are about to drop the column `caseScope` on the `Case` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Case_caseScope_idx";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "caseScope";
