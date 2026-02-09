import type {
  MatchStatus as PrismaMatchStatus,
  ReceiptMatch as PrismaReceiptMatch
} from '@prisma/client';
import type CardTransaction from './CardTransaction';
import type Expense from './Expense';
import type Organization from './Organization';

export type MatchStatus = PrismaMatchStatus;
export interface ReceiptMatch extends PrismaReceiptMatch {
  org?: Organization;
  expense?: Expense;
  cardTxn?: CardTransaction;
}

export default ReceiptMatch;

export type PrismaReceiptMatchType = PrismaReceiptMatch;
