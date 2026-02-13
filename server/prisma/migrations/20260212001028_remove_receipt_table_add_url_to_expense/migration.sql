/*
  Warnings:

  - You are about to drop the column `receiptId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the `Receipt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_receiptId_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_orgId_fkey";

-- DropIndex
DROP INDEX "Expense_receiptId_key";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "receiptId",
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "scanType" TEXT;

-- DropTable
DROP TABLE "Receipt";
