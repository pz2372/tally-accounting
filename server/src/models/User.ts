import type { User as PrismaUser } from '@prisma/client';
import type CardStatement from './CardStatement';
import type DailySalesReport from './DailySalesReport';
import type OrgUser from './OrgUser';
import type Organization from './Organization';

export interface User extends PrismaUser {
	memberships?: OrgUser[];
	ownedOrganizations?: Organization[];
	uploadedStatements?: CardStatement[];
	uploadedSalesReports?: DailySalesReport[];
}

export default User;

export type PrismaUserType = PrismaUser;
