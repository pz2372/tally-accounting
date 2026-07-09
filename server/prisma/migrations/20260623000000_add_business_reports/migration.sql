CREATE TABLE "BusinessReportAutomation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reports" TEXT[] NOT NULL,
    "deliveryChannels" TEXT[] NOT NULL,
    "messageRecipient" TEXT,
    "emailRecipient" TEXT,
    "cadence" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessReportAutomation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessReportAutomation_orgId_createdById_key" ON "BusinessReportAutomation"("orgId", "createdById");
CREATE INDEX "BusinessReportAutomation_orgId_isActive_idx" ON "BusinessReportAutomation"("orgId", "isActive");
CREATE INDEX "BusinessReportAutomation_createdById_idx" ON "BusinessReportAutomation"("createdById");
CREATE INDEX "BusinessReportAutomation_nextRunAt_idx" ON "BusinessReportAutomation"("nextRunAt");

ALTER TABLE "BusinessReportAutomation" ADD CONSTRAINT "BusinessReportAutomation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessReportAutomation" ADD CONSTRAINT "BusinessReportAutomation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
