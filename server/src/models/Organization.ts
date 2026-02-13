import type { Organization as PrismaOrganization } from '@prisma/client';
import type Statement from './Statement';
import type SalesReport from './SalesReport';
import type Expense from './Expense';
import type OrgCategory from './OrgCategory';
import type OrgUser from './OrgUser';
import type OrganizationSubscription from './OrganizationSubscription';
import type ReceiptMatch from './ReceiptMatch';
import type RecurringCharge from './RecurringCharge';
import type RecurringChargeInstance from './RecurringChargeInstance';
import type User from './User';

export interface Organization extends PrismaOrganization {
	billingOwner?: User | null;
	members?: OrgUser[];
	subscription?: OrganizationSubscription | null;
	orgCategories?: OrgCategory[];
	expenses?: Expense[];
	statements?: Statement[];
	salesReports?: SalesReport[];
	matches?: ReceiptMatch[];
	recurringCharges?: RecurringCharge[];
	recurringChargeInstances?: RecurringChargeInstance[];
}

export default Organization;

export type PrismaOrganizationType = PrismaOrganization;
