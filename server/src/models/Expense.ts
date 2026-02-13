import type { Expense as PrismaExpense } from '@prisma/client';
import type Organization from './Organization';
import type OrgCategory from './OrgCategory';
import type ReceiptMatch from './ReceiptMatch';
import type RecurringChargeInstance from './RecurringChargeInstance';

export interface Expense extends PrismaExpense {
	org?: Organization;
	matches?: ReceiptMatch[];
	orgCategory?: OrgCategory | null;
	recurringInstance?: RecurringChargeInstance | null;
}

export default Expense;

export type PrismaExpenseType = PrismaExpense;
