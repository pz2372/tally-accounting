import type { StatementTransaction as PrismaStatementTransaction } from '@prisma/client';
import type Statement from './Statement';
import type ReceiptMatch from './ReceiptMatch';

export interface StatementTransaction extends PrismaStatementTransaction {
	statement?: Statement;
	matches?: ReceiptMatch[];
}

export default StatementTransaction;

export type PrismaStatementTransactionType = PrismaStatementTransaction;
