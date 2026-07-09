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
  { key: 'advertising',          name: 'Advertising',            color: '#F97316', sortOrder: 1 },
  { key: 'car_truck',            name: 'Auto Expenses',          color: '#3B82F6', sortOrder: 2 },
  { key: 'commissions_fees',     name: 'Commissions & Fees',     color: '#8B5CF6', sortOrder: 3 },
  { key: 'contract_labor',       name: 'Contract Labor',         color: '#A855F7', sortOrder: 4 },
  { key: 'insurance',            name: 'Insurance',              color: '#EC4899', sortOrder: 5 },
  { key: 'office_expense',       name: 'Office Expense',         color: '#F59E0B', sortOrder: 6 },
  { key: 'rent',                 name: 'Rent',                   color: '#EAB308', sortOrder: 7 },
  { key: 'repairs_maintenance',  name: 'Repairs & Maintenance',  color: '#84CC16', sortOrder: 8 },
  { key: 'supplies',             name: 'Supplies',               color: '#10B981', sortOrder: 9 },
  { key: 'taxes_licenses',       name: 'Taxes & Licenses',       color: '#EF4444', sortOrder: 10 },
  { key: 'travel',               name: 'Travel',                 color: '#06B6D4', sortOrder: 11 },
  { key: 'meals',                name: 'Meals',                  color: '#F43F5E', sortOrder: 12 },
  { key: 'utilities',            name: 'Utilities',              color: '#0EA5E9', sortOrder: 13 },
  { key: 'wages',                name: 'Wages',                  color: '#9333EA', sortOrder: 14 },
  { key: 'other_expenses',       name: 'Other Expenses',         color: '#6B7280', sortOrder: 15 },
];

const LEGACY_CATEGORY_NAME_TO_KEY = new Map<string, string>([
  ['Labor', 'wages'],
  ['Inventory', 'supplies'],
  ['Operations', 'rent'],
  ['Tax', 'taxes_licenses'],
  ['Transportation', 'car_truck'],
  ['Miscellaneous', 'other_expenses'],
]);

const LEGACY_CATEGORY_KEY_TO_KEY = new Map<string, string>([
  ['labor', 'wages'],
  ['inventory', 'supplies'],
  ['operations', 'rent'],
  ['tax', 'taxes_licenses'],
  ['transportation', 'car_truck'],
  ['miscellaneous', 'other_expenses'],
]);

export const PRESET_CATEGORY_NAMES = new Set([
  ...PRESET_CATEGORIES.map(c => c.name),
  ...LEGACY_CATEGORY_NAME_TO_KEY.keys(),
]);

export const isValidCategoryName = (name: string): boolean =>
  PRESET_CATEGORY_NAMES.has(name);

// Get the key for a given display name (e.g. "Labor" → "labor")
export const getCategoryKey = (name: string): string | undefined =>
  PRESET_CATEGORIES.find(c => c.name === name)?.key || LEGACY_CATEGORY_NAME_TO_KEY.get(name);

// Get the display name for a key (e.g. "labor" → "Labor")
export const getCategoryName = (key: string): string | undefined =>
  PRESET_CATEGORIES.find(c => c.key === key)?.name ||
  PRESET_CATEGORIES.find(c => c.key === LEGACY_CATEGORY_KEY_TO_KEY.get(key))?.name;
