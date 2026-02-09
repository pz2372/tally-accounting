import type { CardStatement as PrismaCardStatement } from '@prisma/client';
import type CardTransaction from './CardTransaction';
import type Organization from './Organization';
import type User from './User';

export interface CardStatement extends PrismaCardStatement {
	org?: Organization;
	uploadedBy?: User | null;
	transactions?: CardTransaction[];
}

export default CardStatement;

export type PrismaCardStatementType = PrismaCardStatement;
