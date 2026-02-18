-- AlterTable
ALTER TABLE "PlaidItem" ADD COLUMN     "syncCursor" TEXT;

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "pendingTransactionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "isoCurrencyCode" TEXT,
    "unofficialCurrencyCode" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "authorizedDate" TIMESTAMP(3),
    "authorizedDatetime" TIMESTAMP(3),
    "datetime" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "merchantName" TEXT,
    "merchantEntityId" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "paymentChannel" TEXT,
    "transactionCode" TEXT,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "category" JSONB,
    "personalFinanceCategory" TEXT,
    "personalFinanceCategoryDetail" TEXT,
    "personalFinanceCategoryIconUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardTransaction_plaidTransactionId_key" ON "CardTransaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "CardTransaction_orgId_date_idx" ON "CardTransaction"("orgId", "date");

-- CreateIndex
CREATE INDEX "CardTransaction_orgId_pending_idx" ON "CardTransaction"("orgId", "pending");

-- CreateIndex
CREATE INDEX "CardTransaction_plaidAccountId_date_idx" ON "CardTransaction"("plaidAccountId", "date");

-- CreateIndex
CREATE INDEX "CardTransaction_pendingTransactionId_idx" ON "CardTransaction"("pendingTransactionId");

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_plaidAccountId_fkey" FOREIGN KEY ("plaidAccountId") REFERENCES "PlaidAccount"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;
