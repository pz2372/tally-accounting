import type { Receipt as PrismaReceipt } from '@prisma/client';
import type Expense from './Expense';
import type Organization from './Organization';

export interface Receipt extends PrismaReceipt {
	org?: Organization;
	expense?: Expense | null;
}

export default Receipt;

export type PrismaReceiptType = PrismaReceipt;
