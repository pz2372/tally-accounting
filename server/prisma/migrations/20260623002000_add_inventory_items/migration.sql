CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "unitPriceCents" INTEGER,
    "totalCents" INTEGER,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryItem_orgId_purchasedAt_idx" ON "InventoryItem"("orgId", "purchasedAt");
CREATE INDEX "InventoryItem_orgId_normalizedName_idx" ON "InventoryItem"("orgId", "normalizedName");
CREATE INDEX "InventoryItem_expenseId_idx" ON "InventoryItem"("expenseId");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
