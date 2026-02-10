// System Categories Configuration
// Single source of truth for all category-related data

export interface CategoryConfig {
    key: string;
    name: string;
    color: string;
    icon: string;
}

export const CATEGORIES: string[] = [
    'Inventory',
    'Operations',
    'Labor',
    'Tax',
    'Miscellaneous',
    'Transportation',
];

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    Inventory: {
        key: 'inventory',
        name: 'Inventory',
        color: '#10B981',
        icon: 'cube-outline',
    },
    Operations: {
        key: 'operations',
        name: 'Operations',
        color: '#F59E0B',
        icon: 'settings-outline',
    },
    Labor: {
        key: 'labor',
        name: 'Labor',
        color: '#9333EA',
        icon: 'people-outline',
    },
    Tax: {
        key: 'tax',
        name: 'Tax',
        color: '#EF4444',
        icon: 'calculator-outline',
    },
    Miscellaneous: {
        key: 'miscellaneous',
        name: 'Miscellaneous',
        color: '#6B7280',
        icon: 'apps-outline',
    },
    Transportation: {
        key: 'transportation',
        name: 'Transportation',
        color: '#3B82F6',
        icon: 'car-outline',
    },
};

export const getCategoryColor = (category: string): string => {
    return CATEGORY_CONFIG[category]?.color || '#6B7280';
};

export const getCategoryIcon = (category: string): string => {
    return CATEGORY_CONFIG[category]?.icon || 'apps-outline';
};

export const getCategoryKey = (category: string): string => {
    return CATEGORY_CONFIG[category]?.key || 'miscellaneous';
};
