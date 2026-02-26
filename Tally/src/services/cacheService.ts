import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
export const CACHE_KEYS = {
  USER: '@current_user',
  PRESET_CATEGORIES: '@preset_categories',
  SYNC_METADATA: '@sync_metadata',
  
  // Per-organization keys (append orgId)
  ORG_MEMBERS: '@org_members_',
  ORG_CATEGORIES: '@org_categories_',
  ORG_RECURRING_CHARGES: '@org_recurring_charges_',
  ORG_RECURRING_INSTANCES: '@org_recurring_instances_',
  ORG_RECEIPTS: '@org_receipts_',
  ORG_EXPENSES: '@org_expenses_',
  ORG_STATEMENTS: '@org_statements_',
  ORG_TRANSACTIONS: '@org_transactions_',
  ORG_SALES_REPORTS: '@org_sales_reports_',
  ORG_RECEIPT_MATCHES: '@org_receipt_matches_',
};

interface SyncMetadata {
  syncedAt: string;
  syncPeriod: {
    start: string;
    end: string;
  };
}

// Save comprehensive login data to cache
export const cacheLoginData = async (data: any) => {
  try {
    const { user, presetCategories, firstOrgData, syncedAt, syncPeriod } = data;

    // Save user data (with organizations list)
    await AsyncStorage.setItem(CACHE_KEYS.USER, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      organizations: user.organizations, // Full list with basic info
    }));

    // Save preset categories
    if (presetCategories) {
      await AsyncStorage.setItem(CACHE_KEYS.PRESET_CATEGORIES, JSON.stringify(presetCategories));
    }

    // Save detailed data for first organization only
    if (firstOrgData) {
      const { orgId, categoryOverrides, expenses, matches } = firstOrgData;

      await AsyncStorage.multiSet([
        [`${CACHE_KEYS.ORG_CATEGORIES}${orgId}`, JSON.stringify(categoryOverrides || [])],
        [`${CACHE_KEYS.ORG_EXPENSES}${orgId}`, JSON.stringify(expenses)],
        [`${CACHE_KEYS.ORG_RECEIPT_MATCHES}${orgId}`, JSON.stringify(matches)],
      ]);
    }

    // Save sync metadata
    const syncMetadata: SyncMetadata = {
      syncedAt,
      syncPeriod,
    };
    await AsyncStorage.setItem(CACHE_KEYS.SYNC_METADATA, JSON.stringify(syncMetadata));

    return true;
  } catch (error) {
    return false;
  }
};

// Clear all cached data
export const clearCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith('@org_') || 
      key === CACHE_KEYS.USER ||
      key === CACHE_KEYS.PRESET_CATEGORIES ||
      key === CACHE_KEYS.SYNC_METADATA
    );
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    // Cache clear failed silently
  }
};

// Get cached data by key
export const getCachedData = async (key: string) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

// Get cached data for specific organization
export const getOrgCachedData = async (orgId: string) => {
  try {
    const [
      categories,
      expenses,
      receiptMatches,
    ] = await Promise.all([
      getCachedData(`${CACHE_KEYS.ORG_CATEGORIES}${orgId}`),
      getCachedData(`${CACHE_KEYS.ORG_EXPENSES}${orgId}`),
      getCachedData(`${CACHE_KEYS.ORG_RECEIPT_MATCHES}${orgId}`),
    ]);

    return {
      categories,
      expenses,
      receiptMatches,
    };
  } catch (error) {
    return null;
  }
};

// Check if cache is stale (older than threshold)
export const isCacheStale = async (maxAgeHours: number = 24): Promise<boolean> => {
  try {
    const metadata = await getCachedData(CACHE_KEYS.SYNC_METADATA);
    if (!metadata || !metadata.syncedAt) return true;

    const syncedAt = new Date(metadata.syncedAt);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - syncedAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceSync > maxAgeHours;
  } catch (error) {
    return true;
  }
};
