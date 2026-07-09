import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getOrgCachedData, CACHE_KEYS } from '../services/cacheService';
import { getAccessToken } from '../services/authService';
import { CATEGORIES, CATEGORY_CONFIG, LEGACY_CATEGORY_KEY_TO_KEY } from '../components/categories';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';
const RECEIPT_THUMB_CACHE_DIR = `${FileSystem.cacheDirectory}receipt-thumbnails/`;

type ReceiptImageSource = { uri: string; headers?: Record<string, string> };

interface ExpenseItem {
  id: string;
  date: string;
  day: number;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK';
  categoryKey?: string;
  notes?: string;
  receiptUrl?: string;
  receiptImageSource?: ReceiptImageSource;
}

interface CategoryData {
  name: string;
  color: string;
  amount: number;
  expenseCount: number;
  expenses: ExpenseItem[];
  isVisible: boolean;
}

interface CategoryScreenProps {
  onExpensePress?: (expense: any) => void;
  dataVersion?: number;
  selectedOrgId?: string | null;
}


export default function CategoryScreen({ onExpensePress, dataVersion = 0, selectedOrgId }: CategoryScreenProps) {
  const { t, language } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const getLocale = () => {
    switch (language) {
      case 'es': return 'es-ES';
      case 'zh': return 'zh-CN';
      case 'id': return 'id-ID';
      default: return 'en-US';
    }
  };
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTotalLoading, setIsTotalLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [receiptImageSources, setReceiptImageSources] = useState<Record<string, ReceiptImageSource>>({});

  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() ||
      (selectedMonth.getFullYear() === now.getFullYear() &&
        selectedMonth.getMonth() >= now.getMonth());
  };

  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadCategoryData(isInitialLoad.current);
    isInitialLoad.current = false;
  }, [selectedMonth, dataVersion, selectedOrgId]);

  const buildCategoryView = (expenses: any[], orgOverrides: any[], userRole: string) => {
    const categoryMap = new Map<string, CategoryData>();
    const normalizeCategoryKey = (key?: string) => key ? (LEGACY_CATEGORY_KEY_TO_KEY[key] || key) : key;
    const overrideByKey = new Map<string, any>();

    orgOverrides?.forEach((override: any) => {
      const key = normalizeCategoryKey(override?.categoryKey || override?.key);
      if (key) overrideByKey.set(key, override);
    });

    let totalSpentAllCategories = 0;

    CATEGORIES.forEach((name) => {
      const config = CATEGORY_CONFIG[name];
      if (!config) return;

      const override = overrideByKey.get(config.key);
      const isEnabled = !override || override.isEnabled !== false;
      const isVisibleToEmployees = !override || override.visibleToEmployees !== false;
      const isVisibleToUser = isEnabled && (userRole === 'ADMIN' || isVisibleToEmployees);

      if (isEnabled) {
        if (!categoryMap.has(config.key)) {
          categoryMap.set(config.key, {
            name: config.name,
            color: config.color,
            amount: 0,
            expenseCount: 0,
            expenses: [],
            isVisible: isVisibleToUser,
          });
        }
      }
    });

    if (expenses && Array.isArray(expenses)) {
      expenses.forEach((expense: any) => {
        if (!expense.categoryKey || expense.deletedAt) {
          return;
        }

        const expenseDate = new Date(expense.expenseDate);
        if (expenseDate.getMonth() !== selectedMonth.getMonth() ||
            expenseDate.getFullYear() !== selectedMonth.getFullYear()) {
          return;
        }

        const normalizedCategoryKey = normalizeCategoryKey(expense.categoryKey);
        if (!normalizedCategoryKey) {
          return;
        }

        const categoryData = categoryMap.get(normalizedCategoryKey);
        if (!categoryData) {
          return;
        }

        const amountDollars = expense.amountCents / 100;

        const override = overrideByKey.get(normalizedCategoryKey);
        const isVisibleToEmployees = !override || override.visibleToEmployees !== false;
        const isVisibleToUser = userRole === 'ADMIN' || isVisibleToEmployees;

        totalSpentAllCategories += amountDollars;

        if (isVisibleToUser) {
          categoryData.expenses.push({
            id: expense.id,
            date: expenseDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            day: expenseDate.getDate(),
            vendor: expense.merchant || 'Unknown',
            description: expense.notes || expense.categoryNameSnapshot || '',
            amount: amountDollars,
            paymentMethod: expense.paymentMethod,
            categoryKey: normalizedCategoryKey,
            notes: expense.notes,
            receiptUrl: expense.receiptUrl,
          });

          categoryData.amount += amountDollars;
          categoryData.expenseCount++;
        }
      });
    }

    const categoriesArray = Array.from(categoryMap.values())
      .filter((cat) => cat.isVisible && cat.expenseCount > 0 && cat.amount !== 0)
      .sort((a, b) => b.amount - a.amount);

    categoriesArray.forEach(cat => {
      cat.expenses.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.day}`);
        const dateB = new Date(`${b.date} ${b.day}`);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return { categoriesArray, totalSpentAllCategories };
  };

  const getReceiptThumbCacheUri = (expense: any) => {
    const versionDate = expense.updatedAt || expense.createdAt || expense.expenseDate || '';
    const version = new Date(versionDate).getTime();
    return `${RECEIPT_THUMB_CACHE_DIR}${expense.id}-${Number.isNaN(version) ? 'current' : version}.jpg`;
  };

  const loadCachedReceiptImages = async (expenses: any[]) => {
    const nextSources: Record<string, ReceiptImageSource> = {};

    await Promise.all((expenses || []).map(async (expense: any) => {
      try {
        if (!expense?.id || !expense?.receiptUrl) return;

        const uri = getReceiptThumbCacheUri(expense);
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          nextSources[expense.id] = { uri };
        }
      } catch {
        // Missing thumbnail cache is non-critical.
      }
    }));

    setReceiptImageSources(nextSources);
  };

  const loadCategoryData = async (showSpinner = false) => {
    try {
      if (showSpinner) setIsLoading(true);
      setIsTotalLoading(true);

      // Determine org ID and user role
      let orgId = selectedOrgId;
      let userRole = 'EMPLOYEE';

      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      if (!orgId) {
        orgId = user.organizations?.[0]?.id;
      }
      if (!orgId) return;

      const org = user.organizations?.find((o: any) => o.id === orgId);
      if (org?.role) {
        userRole = org.role;
      }

      // Show cached data immediately
      const orgData = await getOrgCachedData(orgId);
      const { categories: orgOverrides, expenses } = orgData || {};

      if (expenses && Array.isArray(expenses) && expenses.length > 0) {
        const { categoriesArray, totalSpentAllCategories } = buildCategoryView(expenses, orgOverrides || [], userRole);
        setCategories(categoriesArray);
        setTotalSpent(totalSpentAllCategories);
        setIsLoading(false);
        loadCachedReceiptImages(expenses);
      }

      // Fetch fresh expenses from server for the selected month only
      try {
        const token = await getAccessToken();
        if (!token) return;

        const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
        const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        const res = await fetch(`${API_URL}/api/expenses?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
          headers: { Authorization: `Bearer ${token}`, 'x-org-id': orgId },
        });
        const data = await res.json();

        if (data.success && data.expenses) {
          const freshOverrides = orgOverrides || [];
          const { categoriesArray, totalSpentAllCategories } = buildCategoryView(data.expenses, freshOverrides, userRole);
          setCategories(categoriesArray);
          setTotalSpent(totalSpentAllCategories);
          loadCachedReceiptImages(data.expenses);
        }
      } catch (err) {

        }
    } catch (error) {
      Alert.alert('Error', 'Failed to load category data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsTotalLoading(false);
    }
  };
  
  const maxAmount = categories.length > 0 ? Math.max(...categories.map(c => c.amount)) : 1;

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleCategory = (categoryName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
  };

  const formatMonth = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' });
  };

  const openExpenseDetails = (expense: ExpenseItem, categoryName: string) => {
    onExpensePress?.({
      id: expense.id,
      date: expense.date,
      day: expense.day,
      vendor: expense.vendor,
      category: categoryName,
      status: 'Approved' as const,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      categoryKey: expense.categoryKey,
      notes: expense.notes,
      receiptImageSource: receiptImageSources[expense.id],
    });
  };

  const renderMonthSelector = () => (
    <View style={styles.monthSelector}>
      <TouchableOpacity
        style={styles.monthPillButton}
        onPress={() => {
          const newDate = new Date(selectedMonth);
          newDate.setMonth(newDate.getMonth() - 1);
          setSelectedMonth(newDate);
        }}
        activeOpacity={0.75}
      >
        <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.monthPillCenter}>
        <Text style={styles.monthText}>
          {formatMonth(selectedMonth)}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.monthPillButton, isCurrentOrFutureMonth() && styles.monthPillButtonDisabled]}
        onPress={() => {
          const newDate = new Date(selectedMonth);
          newDate.setMonth(newDate.getMonth() + 1);
          setSelectedMonth(newDate);
        }}
        disabled={isCurrentOrFutureMonth()}
        activeOpacity={0.75}
      >
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isCurrentOrFutureMonth() ? colors.textSecondary : colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('category.title')}</Text>
            <Text style={styles.subtitle}>{t('category.subtitle')}</Text>
          </View>
          {renderMonthSelector()}
        </View>

        {/* Total Spent Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardContent}>
            <View>
              <Text style={styles.totalLabel}>{t('category.totalExpenses').toUpperCase()}</Text>
              <View style={styles.totalAmountContainer}>
                {isTotalLoading ? (
                  <ActivityIndicator size="large" color={colors.textOnDark} />
                ) : (
                  <Text style={styles.totalAmount}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* By Category Section */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{t('category.byCategory')}</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('category.loadingExpenses')}</Text>
            </View>
          ) : (
            categories.map((category, index) => {
              const isExpanded = expandedCategory === category.name;
              return (
                <View key={index} style={[
                  styles.categoryItem,
                  isExpanded && styles.categoryItemExpanded
                ]}>
                  <TouchableOpacity 
                    onPress={() => toggleCategory(category.name)}
                    activeOpacity={0.7}
                    disabled={category.expenseCount === 0}
                  >
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <Text style={[
                          styles.categoryName,
                          category.expenseCount === 0 && styles.categoryNameEmpty
                        ]}>
                          {CATEGORIES.includes(category.name) 
                            ? t('categories.' + category.name.toLowerCase())
                            : category.name}
                        </Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={[
                          styles.categoryAmount,
                          category.expenseCount === 0 && styles.categoryAmountEmpty
                        ]}>
                          ${category.amount.toFixed(2)}
                        </Text>
                        {category.expenseCount > 0 && (
                          <Ionicons 
                            name="chevron-down" 
                            size={16} 
                            color={colors.textSecondary}
                            style={[styles.chevron, isExpanded && styles.chevronExpanded]}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Expanded Expense Items */}
                  {isExpanded && category.expenseCount > 0 && (
                    <View style={styles.expenseList}>
                      {category.expenses.map((expense, expIndex) => (
                        <TouchableOpacity 
                          key={expIndex} 
                          style={styles.expenseItem}
                          activeOpacity={0.7}
                          onPress={() => openExpenseDetails(expense, category.name)}
                        >
                          <View style={styles.expenseDate}>
                            <Text style={styles.expenseMonth}>{expense.date}</Text>
                            <Text style={styles.expenseDay}>{expense.day}</Text>
                          </View>
                          <View style={styles.expenseDetails}>
                            <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                          </View>
                          <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...commonStyles.safeArea,
  },
  container: {
    ...commonStyles.container,
  },
  header: {
    ...commonStyles.header,
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
  },
  compareButton: {
    ...commonStyles.button,
  },
  compareIcon: {
    fontSize: 18,
    marginRight: spacing.sm - 2,
    color: colors.textTertiary,
  },
  compareText: {
    ...commonStyles.buttonText,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: spacing.xs,
  },
  monthPillButton: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPillButtonDisabled: {
    opacity: 0.45,
  },
  monthPillCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 35,
    minWidth: 118,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  transactionCount: {
    ...typography.label,
  },
  totalCard: {
    ...commonStyles.cardDark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  totalCardContent: {
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.label,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  totalAmountContainer: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.textOnDark,
  },
  stackedBarContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  stackedBarSegment: {
    height: '100%',
  },
  categorySection: {
    ...commonStyles.section,
  },
  categoryTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.lg,
  },
  categoryItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryItemExpanded: {
    backgroundColor: '#F0F6FF',
    borderColor: colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  categoryName: {
    ...typography.body,
    marginRight: spacing.sm,
  },
  categoryNameEmpty: {
    color: colors.textTertiary,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryAmount: {
    ...typography.heading,
    marginRight: spacing.sm,
  },
  categoryAmountEmpty: {
    color: colors.textTertiary,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  expenseList: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDate: {
    alignItems: 'center',
    marginRight: spacing.xl,
    minWidth: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  expenseMonth: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray,
    letterSpacing: 0.5,
  },
  expenseDay: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  expenseDetails: {
    flex: 1,
    marginRight: spacing.md,
  },
  expenseVendor: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
