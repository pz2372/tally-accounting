import type { RecurringChargeInstance as PrismaRecurringChargeInstance } from '@prisma/client';
import type Expense from './Expense';
import type Organization from './Organization';
import type RecurringCharge from './RecurringCharge';

export interface RecurringChargeInstance extends PrismaRecurringChargeInstance {
	org?: Organization;
	recurringCharge?: RecurringCharge;
	expense?: Expense | null;
}

export default RecurringChargeInstance;

export type PrismaRecurringChargeInstanceType = PrismaRecurringChargeInstance;
