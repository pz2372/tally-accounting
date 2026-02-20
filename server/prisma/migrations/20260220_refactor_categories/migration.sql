-- Migration: Refactor category model
-- Remove PresetCategory table; OrgCategory now uses categoryKey (string constant)
-- Expense and RecurringCharge use categoryKey + categoryNameSnapshot instead of FK

-- Step 1: Add categoryKey to OrgCategory, populated from PresetCategory.key
ALTER TABLE "OrgCategory" ADD COLUMN "categoryKey" TEXT;

UPDATE "OrgCategory" oc
SET "categoryKey" = pc.key
FROM "PresetCategory" pc
WHERE oc."presetCategoryId" = pc.id;

-- Make it non-null now that it's populated
ALTER TABLE "OrgCategory" ALTER COLUMN "categoryKey" SET NOT NULL;

-- Step 2: Drop old unique constraint and recreate on (orgId, categoryKey)
ALTER TABLE "OrgCategory" DROP CONSTRAINT IF EXISTS "OrgCategory_orgId_presetCategoryId_key";
ALTER TABLE "OrgCategory" ADD CONSTRAINT "OrgCategory_orgId_categoryKey_key" UNIQUE ("orgId", "categoryKey");

-- Step 3: Drop presetCategoryId FK from OrgCategory
ALTER TABLE "OrgCategory" DROP CONSTRAINT IF EXISTS "OrgCategory_presetCategoryId_fkey";
ALTER TABLE "OrgCategory" DROP COLUMN "presetCategoryId";

-- Step 4: Remove customName and sortOrder columns (no longer needed)
ALTER TABLE "OrgCategory" DROP COLUMN IF EXISTS "customName";
ALTER TABLE "OrgCategory" DROP COLUMN IF EXISTS "sortOrder";

-- Step 5: Add categoryKey to Expense
ALTER TABLE "Expense" ADD COLUMN "categoryKey" TEXT;

-- Populate categoryKey from existing orgCategoryId → OrgCategory → PresetCategory
UPDATE "Expense" e
SET "categoryKey" = oc."categoryKey"
FROM "OrgCategory" oc
WHERE e."orgCategoryId" = oc.id;

-- Step 6: Drop orgCategoryId FK from Expense
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_orgCategoryId_fkey";
DROP INDEX IF EXISTS "Expense_orgId_orgCategoryId_idx";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "orgCategoryId";

-- Create new index
CREATE INDEX IF NOT EXISTS "Expense_orgId_categoryKey_idx" ON "Expense"("orgId", "categoryKey");

-- Step 7: Add categoryKey to RecurringCharge
ALTER TABLE "RecurringCharge" ADD COLUMN "categoryKey" TEXT;

-- Populate from existing orgCategoryId
UPDATE "RecurringCharge" rc
SET "categoryKey" = oc."categoryKey"
FROM "OrgCategory" oc
WHERE rc."orgCategoryId" = oc.id;

-- Step 8: Drop orgCategoryId FK from RecurringCharge
ALTER TABLE "RecurringCharge" DROP CONSTRAINT IF EXISTS "RecurringCharge_orgCategoryId_fkey";
ALTER TABLE "RecurringCharge" DROP COLUMN IF EXISTS "orgCategoryId";

-- Step 9: Drop PresetCategory table
DROP TABLE IF EXISTS "PresetCategory";
