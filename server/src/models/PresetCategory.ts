import type { PresetCategory as PrismaPresetCategory } from '@prisma/client';
import type OrgCategory from './OrgCategory';

export interface PresetCategory extends PrismaPresetCategory {
	orgLinks?: OrgCategory[];
}

export default PresetCategory;

export type PrismaPresetCategoryType = PrismaPresetCategory;
