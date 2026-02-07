-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "OrgPermission" AS ENUM ('RECEIPT_CREATE', 'RECEIPT_EDIT', 'RECEIPT_VIEW', 'RECEIPT_DELETE', 'EXPENSE_CREATE', 'EXPENSE_EDIT', 'EXPENSE_VIEW', 'EXPENSE_DELETE', 'STATEMENT_UPLOAD', 'STATEMENT_VIEW', 'STATEMENT_DELETE', 'MATCH_RUN', 'MATCH_REVIEW', 'MEMBER_INVITE', 'MEMBER_EDIT', 'MEMBER_REMOVE', 'BILLING_MANAGE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "SalesReportSource" AS ENUM ('POS_UPLOAD', 'MANUAL_ENTRY', 'API_IMPORT');

-- CreateEnum
CREATE TYPE "SalesReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "RecurringChargeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en-US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingOwnerId" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUser" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'EMPLOYEE',
    "permissions" "OrgPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "plan" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "presetCategoryId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibleToEmployees" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageHash" TEXT,
    "ocrText" TEXT,
    "merchant" TEXT,
    "totalCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "receiptDate" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "receiptId" TEXT,
    "merchant" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orgCategoryId" TEXT,
    "categoryNameSnapshot" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "recurringInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardStatement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT,
    "statementMonth" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'csv',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "postedDate" TIMESTAMP(3) NOT NULL,
    "txnDate" TIMESTAMP(3),
    "merchantRaw" TEXT NOT NULL,
    "merchantNorm" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "last4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptMatch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "cardTxnId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "score" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalesReport" (
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

    CONSTRAINT "DailySalesReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCharge" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchant" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orgCategoryId" TEXT,
    "status" "RecurringChargeStatus" NOT NULL DEFAULT 'ACTIVE',
    "dayOfMonth" INTEGER NOT NULL,
    "useLastDay" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringChargeInstance" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "recurringChargeId" TEXT NOT NULL,
    "expenseId" TEXT,
    "runDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringChargeInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Organization_billingOwnerId_idx" ON "Organization"("billingOwnerId");

-- CreateIndex
CREATE INDEX "OrgUser_userId_idx" ON "OrgUser"("userId");

-- CreateIndex
CREATE INDEX "OrgUser_orgId_idx" ON "OrgUser"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUser_orgId_userId_key" ON "OrgUser"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_orgId_key" ON "OrganizationSubscription"("orgId");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_status_idx" ON "OrganizationSubscription"("status");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_stripeCustomerId_idx" ON "OrganizationSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "OrganizationSubscription_stripeSubscriptionId_idx" ON "OrganizationSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PresetCategory_key_key" ON "PresetCategory"("key");

-- CreateIndex
CREATE INDEX "OrgCategory_orgId_isEnabled_idx" ON "OrgCategory"("orgId", "isEnabled");

-- CreateIndex
CREATE INDEX "OrgCategory_orgId_visibleToEmployees_idx" ON "OrgCategory"("orgId", "visibleToEmployees");

-- CreateIndex
CREATE UNIQUE INDEX "OrgCategory_orgId_presetCategoryId_key" ON "OrgCategory"("orgId", "presetCategoryId");

-- CreateIndex
CREATE INDEX "Receipt_orgId_createdAt_idx" ON "Receipt"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Receipt_orgId_merchant_idx" ON "Receipt"("orgId", "merchant");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_receiptId_key" ON "Expense"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringInstanceId_key" ON "Expense"("recurringInstanceId");

-- CreateIndex
CREATE INDEX "Expense_orgId_expenseDate_idx" ON "Expense"("orgId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_orgId_deletedAt_idx" ON "Expense"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "Expense_orgId_orgCategoryId_idx" ON "Expense"("orgId", "orgCategoryId");

-- CreateIndex
CREATE INDEX "CardStatement_orgId_createdAt_idx" ON "CardStatement"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "CardStatement_uploadedById_idx" ON "CardStatement"("uploadedById");

-- CreateIndex
CREATE INDEX "CardTransaction_statementId_postedDate_idx" ON "CardTransaction"("statementId", "postedDate");

-- CreateIndex
CREATE INDEX "CardTransaction_statementId_amountCents_idx" ON "CardTransaction"("statementId", "amountCents");

-- CreateIndex
CREATE INDEX "CardTransaction_statementId_merchantNorm_idx" ON "CardTransaction"("statementId", "merchantNorm");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptMatch_expenseId_cardTxnId_key" ON "ReceiptMatch"("expenseId", "cardTxnId");

-- CreateIndex
CREATE INDEX "DailySalesReport_orgId_businessDate_idx" ON "DailySalesReport"("orgId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesReport_orgId_businessDate_key" ON "DailySalesReport"("orgId", "businessDate");

-- CreateIndex
CREATE INDEX "RecurringCharge_orgId_status_idx" ON "RecurringCharge"("orgId", "status");

-- CreateIndex
CREATE INDEX "RecurringCharge_orgId_deletedAt_idx" ON "RecurringCharge"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "RecurringCharge_orgId_nextRunAt_idx" ON "RecurringCharge"("orgId", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringChargeInstance_expenseId_key" ON "RecurringChargeInstance"("expenseId");

-- CreateIndex
CREATE INDEX "RecurringChargeInstance_orgId_runDate_idx" ON "RecurringChargeInstance"("orgId", "runDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringChargeInstance_recurringChargeId_runDate_key" ON "RecurringChargeInstance"("recurringChargeId", "runDate");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_billingOwnerId_fkey" FOREIGN KEY ("billingOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUser" ADD CONSTRAINT "OrgUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgCategory" ADD CONSTRAINT "OrgCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgCategory" ADD CONSTRAINT "OrgCategory_presetCategoryId_fkey" FOREIGN KEY ("presetCategoryId") REFERENCES "PresetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_orgCategoryId_fkey" FOREIGN KEY ("orgCategoryId") REFERENCES "OrgCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStatement" ADD CONSTRAINT "CardStatement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptMatch" ADD CONSTRAINT "ReceiptMatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptMatch" ADD CONSTRAINT "ReceiptMatch_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptMatch" ADD CONSTRAINT "ReceiptMatch_cardTxnId_fkey" FOREIGN KEY ("cardTxnId") REFERENCES "CardTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesReport" ADD CONSTRAINT "DailySalesReport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesReport" ADD CONSTRAINT "DailySalesReport_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_orgCategoryId_fkey" FOREIGN KEY ("orgCategoryId") REFERENCES "OrgCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringChargeInstance" ADD CONSTRAINT "RecurringChargeInstance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringChargeInstance" ADD CONSTRAINT "RecurringChargeInstance_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "RecurringCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringChargeInstance" ADD CONSTRAINT "expense_recurring_fk" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
