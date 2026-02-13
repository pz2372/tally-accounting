import type { Statement as PrismaStatement } from '@prisma/client';
import type StatementTransaction from './StatementTransaction';
import type Organization from './Organization';
import type User from './User';

export interface Statement extends PrismaStatement {
	org?: Organization;
	uploadedBy?: User | null;
	transactions?: StatementTransaction[];
}

export default Statement;

export type PrismaStatementType = PrismaStatement;
