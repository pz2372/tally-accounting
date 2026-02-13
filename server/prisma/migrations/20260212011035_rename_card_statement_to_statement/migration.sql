/*
  Warnings:

  - You are about to drop the `CardStatement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CardStatement" DROP CONSTRAINT "CardStatement_orgId_fkey";

-- DropForeignKey
ALTER TABLE "CardStatement" DROP CONSTRAINT "CardStatement_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "CardTransaction" DROP CONSTRAINT "CardTransaction_statementId_fkey";

-- DropTable
DROP TABLE "CardStatement";

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT,
    "statementMonth" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'csv',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Statement_orgId_createdAt_idx" ON "Statement"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Statement_uploadedById_idx" ON "Statement"("uploadedById");

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
