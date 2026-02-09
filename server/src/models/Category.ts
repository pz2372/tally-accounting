import type { PresetCategory as PrismaCategory } from '@prisma/client';

export interface Category extends PrismaCategory {}

export default Category;

export type PrismaCategoryType = PrismaCategory;
