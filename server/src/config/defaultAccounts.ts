// Chart of Accounts — IRS Schedule C aligned.
// Constant definitions, no database table needed.
// Account keys are stored on Expense.categoryKey and RecurringCharge.categoryKey.
// Per-org overrides (enable/disable, visibility) use the OrgCategory model.
//
// Account code numbering: 4xxx = Income, 5xxx = COGS, 6xxx = Expenses

export type AccountType = 'INCOME' | 'EXPENSE' | 'COST_OF_GOODS_SOLD';

export interface AccountDef {
  key: string;            // stored in categoryKey on expenses
  code: string;           // account code e.g. "6010"
  name: string;           // display name e.g. "Advertising"
  type: AccountType;
  scheduleCLine: string | null; // IRS Schedule C line number
  color: string;
  icon: string;
  sortOrder: number;
  legacyCategoryKey: string | null; // maps from old 6-category system
}

export const ACCOUNTS: AccountDef[] = [
  // ── Income (4xxx) ──
  { key: 'gross_sales',          code: '4010', name: 'Gross Sales',            type: 'INCOME', scheduleCLine: '1',  color: '#22C55E', icon: 'cash-outline',              sortOrder: 1,  legacyCategoryKey: null },
  { key: 'returns_allowances',   code: '4020', name: 'Returns & Allowances',   type: 'INCOME', scheduleCLine: '2',  color: '#16A34A', icon: 'return-down-back-outline',   sortOrder: 2,  legacyCategoryKey: null },
  { key: 'other_income',         code: '4030', name: 'Other Income',           type: 'INCOME', scheduleCLine: '6',  color: '#15803D', icon: 'wallet-outline',             sortOrder: 3,  legacyCategoryKey: null },

  // ── Cost of Goods Sold (5xxx) ──
  { key: 'inventory_purchases',  code: '5010', name: 'Inventory Purchases',    type: 'COST_OF_GOODS_SOLD', scheduleCLine: '35', color: '#10B981', icon: 'cube-outline',       sortOrder: 10, legacyCategoryKey: null },
  { key: 'materials_supplies',   code: '5020', name: 'Materials & Supplies',   type: 'COST_OF_GOODS_SOLD', scheduleCLine: '38', color: '#059669', icon: 'construct-outline',  sortOrder: 11, legacyCategoryKey: null },
  { key: 'direct_labor',         code: '5030', name: 'Direct Labor',           type: 'COST_OF_GOODS_SOLD', scheduleCLine: '37', color: '#047857', icon: 'hammer-outline',     sortOrder: 12, legacyCategoryKey: null },

  // ── Expenses (6xxx) — IRS Schedule C Part II, Lines 8–27 ──
  { key: 'advertising',          code: '6010', name: 'Advertising',            type: 'EXPENSE', scheduleCLine: '8',   color: '#F97316', icon: 'megaphone-outline',   sortOrder: 20, legacyCategoryKey: null },
  { key: 'car_truck',            code: '6020', name: 'Auto Expenses',          type: 'EXPENSE', scheduleCLine: '9',   color: '#3B82F6', icon: 'car-outline',         sortOrder: 21, legacyCategoryKey: 'transportation' },
  { key: 'commissions_fees',     code: '6030', name: 'Commissions & Fees',     type: 'EXPENSE', scheduleCLine: '10',  color: '#8B5CF6', icon: 'people-outline',      sortOrder: 22, legacyCategoryKey: null },
  { key: 'contract_labor',       code: '6040', name: 'Contract Labor',         type: 'EXPENSE', scheduleCLine: '11',  color: '#A855F7', icon: 'person-outline',      sortOrder: 23, legacyCategoryKey: null },
  { key: 'insurance',            code: '6050', name: 'Insurance',              type: 'EXPENSE', scheduleCLine: '15',  color: '#EC4899', icon: 'shield-outline',      sortOrder: 24, legacyCategoryKey: null },
  { key: 'office_expense',       code: '6060', name: 'Office Expense',         type: 'EXPENSE', scheduleCLine: '18',  color: '#F59E0B', icon: 'desktop-outline',     sortOrder: 25, legacyCategoryKey: null },
  { key: 'rent',                 code: '6070', name: 'Rent',                   type: 'EXPENSE', scheduleCLine: '20b', color: '#EAB308', icon: 'home-outline',        sortOrder: 26, legacyCategoryKey: 'operations' },
  { key: 'repairs_maintenance',  code: '6080', name: 'Repairs & Maintenance',  type: 'EXPENSE', scheduleCLine: '21',  color: '#84CC16', icon: 'build-outline',       sortOrder: 27, legacyCategoryKey: null },
  { key: 'supplies',             code: '6090', name: 'Supplies',               type: 'EXPENSE', scheduleCLine: '22',  color: '#10B981', icon: 'cube-outline',        sortOrder: 28, legacyCategoryKey: 'inventory' },
  { key: 'taxes_licenses',       code: '6100', name: 'Taxes & Licenses',       type: 'EXPENSE', scheduleCLine: '23',  color: '#EF4444', icon: 'calculator-outline',  sortOrder: 29, legacyCategoryKey: 'tax' },
  { key: 'travel',               code: '6110', name: 'Travel',                 type: 'EXPENSE', scheduleCLine: '24a', color: '#06B6D4', icon: 'airplane-outline',    sortOrder: 30, legacyCategoryKey: null },
  { key: 'meals',                code: '6120', name: 'Meals',                  type: 'EXPENSE', scheduleCLine: '24b', color: '#F43F5E', icon: 'restaurant-outline',  sortOrder: 31, legacyCategoryKey: null },
  { key: 'utilities',            code: '6130', name: 'Utilities',              type: 'EXPENSE', scheduleCLine: '25',  color: '#0EA5E9', icon: 'flash-outline',       sortOrder: 32, legacyCategoryKey: null },
  { key: 'wages',                code: '6140', name: 'Wages',                  type: 'EXPENSE', scheduleCLine: '26',  color: '#9333EA', icon: 'people-outline',      sortOrder: 33, legacyCategoryKey: 'labor' },
  { key: 'other_expenses',       code: '6150', name: 'Other Expenses',         type: 'EXPENSE', scheduleCLine: '27',  color: '#6B7280', icon: 'apps-outline',        sortOrder: 34, legacyCategoryKey: 'miscellaneous' },
];

// ── Lookup helpers ──

const byKey = new Map(ACCOUNTS.map(a => [a.key, a]));
const byName = new Map(ACCOUNTS.map(a => [a.name, a]));
const byCode = new Map(ACCOUNTS.map(a => [a.code, a]));

// Legacy 6-category key → new account key
const legacyMap = new Map<string, string>();
for (const a of ACCOUNTS) {
  if (a.legacyCategoryKey) {
    legacyMap.set(a.legacyCategoryKey, a.key);
  }
}

// Old frontend display names → new account keys.
// The mobile app sends these names (e.g. "Labor") in categoryName fields.
export const LEGACY_DISPLAY_NAME_TO_KEY = new Map<string, string>([
  ['Labor',          'wages'],
  ['Inventory',      'supplies'],
  ['Operations',     'rent'],
  ['Tax',            'taxes_licenses'],
  ['Transportation', 'car_truck'],
  ['Miscellaneous',  'other_expenses'],
  ['Wages', 'wages'],
  ['Supplies', 'supplies'],
  ['Rent', 'rent'],
  ['Taxes & Licenses', 'taxes_licenses'],
  ['Auto Expenses', 'car_truck'],
  ['Other Expenses', 'other_expenses'],
]);

export const ACCOUNT_KEYS = new Set(ACCOUNTS.map(a => a.key));

export const getAccountByKey = (key: string): AccountDef | undefined => byKey.get(key);
export const getAccountByName = (name: string): AccountDef | undefined => byName.get(name);
export const getAccountByCode = (code: string): AccountDef | undefined => byCode.get(code);

export const getAccountName = (key: string): string | undefined => byKey.get(key)?.name || byKey.get(resolveLegacyKey(key))?.name;
export const getAccountKey = (name: string): string | undefined => byName.get(name)?.key || LEGACY_DISPLAY_NAME_TO_KEY.get(name);

export const isValidAccountKey = (key: string): boolean => ACCOUNT_KEYS.has(key);

// Resolve a key that might be a legacy category key (e.g. "labor") to the new account key (e.g. "wages")
export const resolveLegacyKey = (key: string): string => legacyMap.get(key) ?? key;

// Get all expense-type accounts (for expense creation pickers)
export const getExpenseAccounts = (): AccountDef[] =>
  ACCOUNTS.filter(a => a.type === 'EXPENSE');

// Get all COGS accounts
export const getCOGSAccounts = (): AccountDef[] =>
  ACCOUNTS.filter(a => a.type === 'COST_OF_GOODS_SOLD');

// Get all income accounts
export const getIncomeAccounts = (): AccountDef[] =>
  ACCOUNTS.filter(a => a.type === 'INCOME');
