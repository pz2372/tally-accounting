/*
  Warnings:

  - You are about to drop the `CardTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CardTransaction" DROP CONSTRAINT "CardTransaction_statementId_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptMatch" DROP CONSTRAINT "ReceiptMatch_cardTxnId_fkey";

-- DropTable
DROP TABLE "CardTransaction";

-- CreateTable
CREATE TABLE "StatementTransaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "postedDate" TIMESTAMP(3) NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "merchantRaw" TEXT NOT NULL,
    "merchantNorm" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "last4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementTransaction_statementId_postedDate_idx" ON "StatementTransaction"("statementId", "postedDate");

-- CreateIndex
CREATE INDEX "StatementTransaction_statementId_amountCents_idx" ON "StatementTransaction"("statementId", "amountCents");

-- CreateIndex
CREATE INDEX "StatementTransaction_statementId_merchantNorm_idx" ON "StatementTransaction"("statementId", "merchantNorm");

-- AddForeignKey
ALTER TABLE "StatementTransaction" ADD CONSTRAINT "StatementTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptMatch" ADD CONSTRAINT "ReceiptMatch_cardTxnId_fkey" FOREIGN KEY ("cardTxnId") REFERENCES "StatementTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
