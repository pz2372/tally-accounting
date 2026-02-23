import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { createAuthenticatedAxios } from '../services/authService';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface SalesReportScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

interface ExpenseCategory {
  name: string;
  amountCents: number;
}

interface MonthlySummary {
  month: string;
  grossSalesCents: number;
  netSalesCents: number;
  cashCents: number;
  tipsCents: number;
  taxCents: number;
  discountsCents: number;
  refundsCents: number;
  totalExpensesCents: number;
  cashExpensesCents: number;
  cashAfterExpensesCents: number;
  netProfitCents: number;
  expenseCategories: ExpenseCategory[];
  salesReportCount: number;
}

const centsToDollars = (cents: number) => cents / 100;

const formatDollars = (cents: number) => {
  const dollars = centsToDollars(cents);
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export default function SalesReportScreen({ onBack, selectedOrgId }: SalesReportScreenProps) {
  const { t, language } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expensesExpanded, setExpensesExpanded] = useState(false);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocale = () => {
    switch (language) {
      case 'es': return 'es-ES';
      case 'zh': return 'zh-CN';
      default: return 'en-US';
    }
  };

  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() ||
      (selectedMonth.getFullYear() === now.getFullYear() &&
        selectedMonth.getMonth() >= now.getMonth());
  };

  const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getOrgId = async (): Promise<string | null> => {
    if (selectedOrgId) return selectedOrgId;
    try {
      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.organizations?.[0]?.id || null;
    } catch {
      return null;
    }
  };

  const fetchMonthlySummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const orgId = await getOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      const api = await createAuthenticatedAxios();
      const monthKey = getMonthKey(selectedMonth);
      const response = await api.get('/api/sales-reports/monthly-summary', {
        params: { month: monthKey },
        headers: { 'x-org-id': orgId },
      });

      if (response.data.success) {
        setSummary(response.data.summary);
      } else {
        setError(response.data.error || 'Failed to load data');
      }
    } catch (err) {
      console.error('fetchMonthlySummary error:', err);
      setError('Failed to load sales report');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchMonthlySummary();
  }, [fetchMonthlySummary]);

  const swipeHandlers = useSwipeBack(onBack);

  const hasData = summary && (summary.salesReportCount > 0 || summary.totalExpensesCents > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('salesReport.title')}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Month Toggle */}
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
              {selectedMonth.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.noDataContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : hasData && summary ? (
            <View style={styles.monthlyReport}>
              {/* Net Profit Card */}
              <View style={styles.netProfitCard}>
                <View style={styles.netProfitContent}>
                  <Text style={styles.netProfitLabel}>{t('salesReport.netProfit')}</Text>
                  <Text style={styles.netProfitValue}>
                    {formatDollars(summary.netProfitCents)}
                  </Text>
                  {summary.netSalesCents > 0 && (
                    <Text style={styles.netProfitPercentage}>
                      {((summary.netProfitCents / summary.netSalesCents) * 100).toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Section 1: Gross & Net Sales */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.grossSales')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.grossSalesCents)}
                    </Text>
                  </View>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.netSales')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.netSalesCents)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section 2: Expenses with Expandable Categories */}
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.expensesHeader}
                  onPress={() => setExpensesExpanded(!expensesExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={styles.expensesHeaderLeft}>
                    <Text style={styles.sectionLabel}>{t('salesReport.expenses')}</Text>
                  </View>
                  <View style={styles.expensesHeaderRight}>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.totalExpensesCents)}
                    </Text>
                    <Ionicons
                      name={expensesExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textSecondary}
                      style={styles.chevronIcon}
                    />
                  </View>
                </TouchableOpacity>
                {expensesExpanded && summary.expenseCategories.length > 0 && (
                  <View style={styles.categoryBreakdown}>
                    {summary.expenseCategories.map((category, index) => {
                      const percentage = summary.netSalesCents > 0
                        ? (category.amountCents / summary.netSalesCents) * 100
                        : 0;
                      return (
                        <View key={index}>
                          <View style={styles.categoryRow}>
                            <Text style={styles.categoryName}>{category.name}</Text>
                            <View style={styles.categoryRight}>
                              <Text style={styles.categoryAmount}>
                                {formatDollars(category.amountCents)}
                              </Text>
                              <Text style={[styles.percentageText, styles.greenText]}>
                                {percentage.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Section 3: Cash */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.cashRevenue')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.cashCents)}
                    </Text>
                  </View>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.cashAfterExpenses')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.cashAfterExpensesCents)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section 4: Other Financial Details */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.tax')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.taxCents)}
                    </Text>
                  </View>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.tips')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.tipsCents)}
                    </Text>
                  </View>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.refunds')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.refundsCents)}
                    </Text>
                  </View>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{t('salesReport.discounts')}</Text>
                    <Text style={styles.sectionValue}>
                      {formatDollars(summary.discountsCents)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="analytics-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.noDataText}>
                {error || t('salesReport.noData')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerButton: {
    padding: spacing.xs,
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
    color: colors.borderLight,
    opacity: 0.5,
  },
  monthInfo: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  monthlyReport: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  netProfitCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  netProfitContent: {
    alignItems: 'center',
  },
  netProfitLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  netProfitValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  netProfitPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#31cc5f',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  expensesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  expensesHeaderLeft: {
    flex: 1,
  },
  sectionContent: {
    gap: spacing.xs,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  expensesHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chevronIcon: {
    marginLeft: spacing.xs,
  },
  categoryBreakdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  categoryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    minWidth: 40,
    textAlign: 'right',
  },
  greenText: {
    color: '#31cc5f',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
});
