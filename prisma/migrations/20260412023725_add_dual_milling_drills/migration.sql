-- AlterTable
ALTER TABLE "CaseMilling" ADD COLUMN     "coarseMillingDrillId" TEXT,
ADD COLUMN     "fineMillingDrillId" TEXT;

-- CreateIndex
CREATE INDEX "CaseMilling_fineMillingDrillId_idx" ON "CaseMilling"("fineMillingDrillId");

-- CreateIndex
CREATE INDEX "CaseMilling_coarseMillingDrillId_idx" ON "CaseMilling"("coarseMillingDrillId");

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_fineMillingDrillId_fkey" FOREIGN KEY ("fineMillingDrillId") REFERENCES "MillingDrill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMilling" ADD CONSTRAINT "CaseMilling_coarseMillingDrillId_fkey" FOREIGN KEY ("coarseMillingDrillId") REFERENCES "MillingDrill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
