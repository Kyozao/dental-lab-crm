/*
  Warnings:

  - You are about to drop the column `changedByUserId` on the `CaseStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CaseStatusHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CaseStatusHistory" DROP COLUMN "changedByUserId",
DROP COLUMN "userId";
