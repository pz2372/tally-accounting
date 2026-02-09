import type { CardTransaction as PrismaCardTransaction } from '@prisma/client';
import type CardStatement from './CardStatement';
import type ReceiptMatch from './ReceiptMatch';

export interface CardTransaction extends PrismaCardTransaction {
	statement?: CardStatement;
	matches?: ReceiptMatch[];
}

export default CardTransaction;

export type PrismaCardTransactionType = PrismaCardTransaction;
