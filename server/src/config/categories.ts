// Preset categories — single source of truth.
// These are seeded to PresetCategory on server startup and used for
// validation/lookup without extra DB queries.

export interface PresetCategoryDef {
  key: string;
  name: string;
  color: string;
  sortOrder: number;
}

export const PRESET_CATEGORIES: PresetCategoryDef[] = [
  { key: 'miscellaneous',  name: 'Miscellaneous',  color: '#6B7280', sortOrder: 1 },
  { key: 'labor',          name: 'Labor',          color: '#9333EA', sortOrder: 2 },
  { key: 'inventory',      name: 'Inventory',      color: '#10B981', sortOrder: 3 },
  { key: 'operations',     name: 'Operations',     color: '#F59E0B', sortOrder: 4 },
  { key: 'tax',            name: 'Tax',            color: '#EF4444', sortOrder: 5 },
  { key: 'transportation', name: 'Transportation', color: '#3B82F6', sortOrder: 6 },
];

export const PRESET_CATEGORY_NAMES = new Set(PRESET_CATEGORIES.map(c => c.name));

export const isValidCategoryName = (name: string): boolean =>
  PRESET_CATEGORY_NAMES.has(name);

// Get the key for a given display name (e.g. "Labor" → "labor")
export const getCategoryKey = (name: string): string | undefined =>
  PRESET_CATEGORIES.find(c => c.name === name)?.key;

// Get the display name for a key (e.g. "labor" → "Labor")
export const getCategoryName = (key: string): string | undefined =>
  PRESET_CATEGORIES.find(c => c.key === key)?.name;
