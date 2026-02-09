import type {
  OrgPermission as PrismaOrgPermission,
  OrgRole as PrismaOrgRole,
  OrgUser as PrismaOrgUser
} from '@prisma/client';
import type Organization from './Organization';
import type User from './User';

export type OrgRole = PrismaOrgRole;
export type OrgPermission = PrismaOrgPermission;
export interface OrgUser extends PrismaOrgUser {
  org?: Organization;
  user?: User;
}

export default OrgUser;

export type PrismaOrgUserType = PrismaOrgUser;
