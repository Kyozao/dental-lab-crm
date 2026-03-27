/*
  Warnings:

  - The `cadDesignerId` column on the `Case` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdByUserId` column on the `Case` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'DESIGN_READY';

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_cadDesignerId_fkey";

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "cadDesignerId",
ADD COLUMN     "cadDesignerId" UUID,
DROP COLUMN "createdByUserId",
ADD COLUMN     "createdByUserId" UUID;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Case_cadDesignerId_idx" ON "Case"("cadDesignerId");

-- CreateIndex
CREATE INDEX "Case_createdByUserId_idx" ON "Case"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_cadDesignerId_fkey" FOREIGN KEY ("cadDesignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
