// System Categories Configuration
// Single source of truth for all category-related data

export interface CategoryConfig {
    key: string;
    name: string;
    color: string;
    icon: string;
}

export interface CategorySetting {
    key: string;
    name: string;
    color: string;
    icon: string;
    sortOrder: number;
    isEnabled: boolean;
    visibleToEmployees: boolean;
}

export const CATEGORIES: string[] = [
    'Advertising',
    'Auto Expenses',
    'Commissions & Fees',
    'Contract Labor',
    'Insurance',
    'Office Expense',
    'Rent',
    'Repairs & Maintenance',
    'Supplies',
    'Supplies (Food)',
    'Taxes & Licenses',
    'Travel',
    'Meals',
    'Utilities',
    'Wages',
    'Other Expenses',
];

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    Advertising: {
        key: 'advertising',
        name: 'Advertising',
        color: '#F97316',
        icon: 'megaphone-outline',
    },
    'Auto Expenses': {
        key: 'car_truck',
        name: 'Auto Expenses',
        color: '#3B82F6',
        icon: 'car-outline',
    },
    'Commissions & Fees': {
        key: 'commissions_fees',
        name: 'Commissions & Fees',
        color: '#8B5CF6',
        icon: 'people-outline',
    },
    'Contract Labor': {
        key: 'contract_labor',
        name: 'Contract Labor',
        color: '#A855F7',
        icon: 'person-outline',
    },
    Insurance: {
        key: 'insurance',
        name: 'Insurance',
        color: '#EC4899',
        icon: 'shield-outline',
    },
    'Office Expense': {
        key: 'office_expense',
        name: 'Office Expense',
        color: '#F59E0B',
        icon: 'desktop-outline',
    },
    Rent: {
        key: 'rent',
        name: 'Rent',
        color: '#EAB308',
        icon: 'home-outline',
    },
    'Repairs & Maintenance': {
        key: 'repairs_maintenance',
        name: 'Repairs & Maintenance',
        color: '#84CC16',
        icon: 'build-outline',
    },
    Supplies: {
        key: 'supplies',
        name: 'Supplies',
        color: '#10B981',
        icon: 'cube-outline',
    },
    'Supplies (Food)': {
        key: 'supplies_food',
        name: 'Supplies (Food)',
        color: '#059669',
        icon: 'restaurant-outline',
    },
    'Taxes & Licenses': {
        key: 'taxes_licenses',
        name: 'Taxes & Licenses',
        color: '#EF4444',
        icon: 'calculator-outline',
    },
    Travel: {
        key: 'travel',
        name: 'Travel',
        color: '#06B6D4',
        icon: 'airplane-outline',
    },
    Meals: {
        key: 'meals',
        name: 'Meals',
        color: '#F43F5E',
        icon: 'restaurant-outline',
    },
    Utilities: {
        key: 'utilities',
        name: 'Utilities',
        color: '#0EA5E9',
        icon: 'flash-outline',
    },
    Wages: {
        key: 'wages',
        name: 'Wages',
        color: '#9333EA',
        icon: 'people-outline',
    },
    'Other Expenses': {
        key: 'other_expenses',
        name: 'Other Expenses',
        color: '#6B7280',
        icon: 'apps-outline',
    },
    Labor: { key: 'wages', name: 'Wages', color: '#9333EA', icon: 'people-outline' },
    Inventory: { key: 'supplies', name: 'Supplies', color: '#10B981', icon: 'cube-outline' },
    Operations: { key: 'rent', name: 'Rent', color: '#EAB308', icon: 'home-outline' },
    Tax: { key: 'taxes_licenses', name: 'Taxes & Licenses', color: '#EF4444', icon: 'calculator-outline' },
    Transportation: { key: 'car_truck', name: 'Auto Expenses', color: '#3B82F6', icon: 'car-outline' },
    Miscellaneous: { key: 'other_expenses', name: 'Other Expenses', color: '#6B7280', icon: 'apps-outline' },
};

export const LEGACY_CATEGORY_KEY_TO_KEY: Record<string, string> = {
    labor: 'wages',
    inventory: 'supplies',
    operations: 'rent',
    tax: 'taxes_licenses',
    transportation: 'car_truck',
    miscellaneous: 'other_expenses',
};

const LEGACY_CATEGORY_KEY_TO_NAME: Record<string, string> = {
    labor: 'Wages',
    inventory: 'Supplies',
    operations: 'Rent',
    tax: 'Taxes & Licenses',
    transportation: 'Auto Expenses',
    miscellaneous: 'Other Expenses',
};

const getConfigByKey = (key: string): CategoryConfig | undefined =>
    Object.values(CATEGORY_CONFIG).find(config => config.key === key);

export const getCategoryColor = (category: string): string => {
    const normalizedCategory = LEGACY_CATEGORY_KEY_TO_NAME[category] || category;
    return CATEGORY_CONFIG[normalizedCategory]?.color || getConfigByKey(normalizedCategory)?.color || '#6B7280';
};

export const getCategoryIcon = (category: string): string => {
    const normalizedCategory = LEGACY_CATEGORY_KEY_TO_NAME[category] || category;
    return CATEGORY_CONFIG[normalizedCategory]?.icon || getConfigByKey(normalizedCategory)?.icon || 'apps-outline';
};

export const getCategoryKey = (category: string): string => {
    return CATEGORY_CONFIG[category]?.key || category;
};

export const getCategoryName = (key: string): string => {
    const normalizedKey = LEGACY_CATEGORY_KEY_TO_NAME[key] || key;
    return CATEGORIES.find(category => CATEGORY_CONFIG[category]?.key === normalizedKey)
        || CATEGORY_CONFIG[key]?.name
        || CATEGORY_CONFIG[normalizedKey]?.name
        || key;
};

export const getFullCategorySettings = (settings: any[] = []): CategorySetting[] => {
    const settingsByKey = new Map<string, any>();

    settings.forEach((setting: any) => {
        const rawKey = setting?.key || setting?.categoryKey || (setting?.name ? CATEGORY_CONFIG[setting.name]?.key : undefined);
        if (!rawKey) return;
        settingsByKey.set(LEGACY_CATEGORY_KEY_TO_KEY[rawKey] || rawKey, setting);
    });

    return CATEGORIES.map((name, index) => {
        const config = CATEGORY_CONFIG[name];
        const saved = settingsByKey.get(config.key);

        return {
            key: config.key,
            name: config.name,
            color: config.color,
            icon: config.icon,
            sortOrder: saved?.sortOrder ?? index,
            isEnabled: saved ? (saved.isEnabled ?? saved.isActive) !== false : true,
            visibleToEmployees: saved ? saved.visibleToEmployees !== false : true,
        };
    });
};
