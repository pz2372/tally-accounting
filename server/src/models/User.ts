import type { User as PrismaUser } from '@prisma/client';
import type Statement from './Statement';
import type SalesReport from './SalesReport';
import type OrgUser from './OrgUser';
import type Organization from './Organization';

export interface User extends PrismaUser {
	memberships?: OrgUser[];
	ownedOrganizations?: Organization[];
	uploadedStatements?: Statement[];
	uploadedSalesReports?: SalesReport[];
}

export default User;

export type PrismaUserType = PrismaUser;
