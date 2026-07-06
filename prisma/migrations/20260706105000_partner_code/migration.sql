-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partnerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_partnerCode_key" ON "User"("partnerCode");

