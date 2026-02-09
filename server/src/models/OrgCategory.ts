import type { OrgCategory as PrismaOrgCategory } from '@prisma/client';
import type Expense from './Expense';
import type Organization from './Organization';
import type PresetCategory from './PresetCategory';
import type RecurringCharge from './RecurringCharge';

export interface OrgCategory extends PrismaOrgCategory {
	org?: Organization;
	preset?: PresetCategory;
	expenses?: Expense[];
	recurringCharges?: RecurringCharge[];
}

export default OrgCategory;

export type PrismaOrgCategoryType = PrismaOrgCategory;
