/*
  Warnings:

  - You are about to drop the `DailySalesReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailySalesReport" DROP CONSTRAINT "DailySalesReport_orgId_fkey";

-- DropForeignKey
ALTER TABLE "DailySalesReport" DROP CONSTRAINT "DailySalesReport_uploadedById_fkey";

-- DropTable
DROP TABLE "DailySalesReport";

-- CreateTable
CREATE TABLE "SalesReport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "source" "SalesReportSource" NOT NULL DEFAULT 'POS_UPLOAD',
    "status" "SalesReportStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileHash" TEXT,
    "uploadedById" TEXT,
    "grossSalesCents" INTEGER,
    "netSalesCents" INTEGER,
    "cashCents" INTEGER,
    "tipsCents" INTEGER,
    "taxCents" INTEGER,
    "discountsCents" INTEGER,
    "refundsCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "parsedPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesReport_orgId_businessDate_idx" ON "SalesReport"("orgId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReport_orgId_businessDate_key" ON "SalesReport"("orgId", "businessDate");

-- AddForeignKey
ALTER TABLE "SalesReport" ADD CONSTRAINT "SalesReport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReport" ADD CONSTRAINT "SalesReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
