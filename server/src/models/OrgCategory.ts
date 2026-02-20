import type { OrgCategory as PrismaOrgCategory } from '@prisma/client';
import type Organization from './Organization';

export interface OrgCategory extends PrismaOrgCategory {
  org?: Organization;
}

export default OrgCategory;

export type PrismaOrgCategoryType = PrismaOrgCategory;
