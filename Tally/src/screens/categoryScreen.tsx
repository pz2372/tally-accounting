import React, { useState, useContext, useEffect } from 'react';
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
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getOrgCachedData } from '../services/cacheService';
import { CATEGORIES, CATEGORY_CONFIG } from '../components/categories';

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
}

interface CategoryData {
  name: string;
  color: string;
  amount: number;
  expenseCount: number;
  expenses: ExpenseItem[];
}

interface CategoryScreenProps {
  onExpensePress?: (expense: any) => void;
  dataVersion?: number;
  selectedOrgId?: string | null;
}


export default function CategoryScreen({ onExpensePress, dataVersion = 0, selectedOrgId }: CategoryScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  
  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() || 
           (selectedMonth.getFullYear() === now.getFullYear() && 
            selectedMonth.getMonth() >= now.getMonth());
  };

  useEffect(() => {
    loadCategoryData();
  }, [selectedMonth, dataVersion, selectedOrgId]);

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);

      // Determine org ID: use selected or fall back to first org
      let orgId = selectedOrgId;
      if (!orgId) {
        const userStr = await AsyncStorage.getItem('@current_user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        orgId = user.organizations?.[0]?.id;
      }
      if (!orgId) return;

      // Load org data from cache (categories here = org overrides only)
      const orgData = await getOrgCachedData(orgId);
      const { categories: orgOverrides, expenses } = orgData || {};

      // Build category data from constants, filtered by org overrides
      const categoryMap = new Map<string, CategoryData>();

      CATEGORIES.forEach((name) => {
        const config = CATEGORY_CONFIG[name];
        if (!config) return;

        // Check if org has disabled this category
        const override = orgOverrides?.find((oc: any) => oc.categoryKey === config.key);
        const isEnabled = !override || override.isEnabled !== false;

        if (isEnabled) {
          categoryMap.set(config.key, {
            name: config.name,
            color: config.color,
            amount: 0,
            expenseCount: 0,
            expenses: [],
          });
        }
      });

      // Organize expenses by category (filtered by selected month)
      if (expenses && Array.isArray(expenses)) {
        expenses.forEach((expense: any) => {
          if (!expense.categoryKey || expense.deletedAt) return;

          // Filter by selected month
          const expenseDate = new Date(expense.expenseDate);
          if (expenseDate.getMonth() !== selectedMonth.getMonth() ||
              expenseDate.getFullYear() !== selectedMonth.getFullYear()) {
            return;
          }

          const categoryData = categoryMap.get(expense.categoryKey);
          if (!categoryData) return;

          const amountDollars = expense.amountCents / 100;

          categoryData.expenses.push({
            id: expense.id,
            date: expenseDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            day: expenseDate.getDate(),
            vendor: expense.merchant || 'Unknown',
            description: expense.notes || expense.categoryNameSnapshot || '',
            amount: amountDollars,
            paymentMethod: expense.paymentMethod,
            categoryKey: expense.categoryKey,
            notes: expense.notes,
          });

          categoryData.amount += amountDollars;
          categoryData.expenseCount++;
        });
      }

      // Convert map to array and sort by amount (descending)
      const categoriesArray = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount);

      // Sort expenses within each category by date (most recent first)
      categoriesArray.forEach(cat => {
        cat.expenses.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.day}`);
          const dateB = new Date(`${b.date} ${b.day}`);
          return dateB.getTime() - dateA.getTime();
        });
      });

      setCategories(categoriesArray);
      setTotalSpent(categoriesArray.reduce((sum, cat) => sum + cat.amount, 0));
    } catch (error) {
      Alert.alert('Error', 'Failed to load category data. Please try again.');
    } finally {
      setIsLoading(false);
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
    const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    return `${t('month.' + monthKeys[monthIndex])} ${year}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('category.title')}</Text>
            <Text style={styles.subtitle}>{t('category.subtitle')}</Text>
          </View>
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedMonth(newDate);
            }}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.monthInfo}>
            <Text style={styles.monthText}>
              {formatMonth(selectedMonth)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedMonth(newDate);
            }}
            disabled={isCurrentOrFutureMonth()}
          >
            <Text style={[styles.navButtonText, isCurrentOrFutureMonth() && styles.navButtonDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Total Spent Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalCardContent}>
            <View>
              <Text style={styles.totalLabel}>{t('category.totalExpenses').toUpperCase()}</Text>
              <Text style={styles.totalAmount}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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
                          onPress={() => onExpensePress && onExpensePress({
                            id: expense.id,
                            date: expense.date,
                            day: expense.day,
                            vendor: expense.vendor,
                            category: category.name,
                            status: 'Approved' as const,
                            amount: expense.amount,
                            paymentMethod: expense.paymentMethod,
                            categoryKey: expense.categoryKey,
                            notes: expense.notes,
                          })}
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
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  navButtonDisabled: {
    opacity: 0.5,
    color: colors.borderLight,
  },
  monthInfo: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
