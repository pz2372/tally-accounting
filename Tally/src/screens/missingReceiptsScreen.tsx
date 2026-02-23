import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getCategoryColor, CATEGORIES } from '../components/categories';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface MissingReceiptsScreenProps {
  expenses: any[];
  onBack: () => void;
  onExpensePress?: (expense: any) => void;
}

export default function MissingReceiptsScreen({ expenses, onBack, onExpensePress }: MissingReceiptsScreenProps) {
  const { t } = useContext(LanguageContext);
  const swipeHandlers = useSwipeBack(onBack);

  const formatExpense = (exp: any) => {
    const expenseDate = new Date(exp.expenseDate);
    const categoryName = exp.categoryNameSnapshot || 'Miscellaneous';
    return {
      id: exp.id,
      date: expenseDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: expenseDate.getDate(),
      vendor: exp.merchant || 'Unknown',
      category: categoryName,
      status: 'Approved' as const,
      amount: exp.amountCents / 100,
      paymentMethod: exp.paymentMethod,
      orgCategoryId: exp.orgCategoryId,
      notes: exp.notes,
    };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('home.unmatchedLabel')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>{t('home.noMissingReceipts') || 'No Missing Receipts'}</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {expenses.map((raw: any) => {
                const expense = formatExpense(raw);
                return (
                  <TouchableOpacity
                    key={expense.id}
                    style={styles.expenseCard}
                    activeOpacity={0.7}
                    onPress={() => onExpensePress?.(expense)}
                  >
                    <View style={styles.expenseDate}>
                      <Text style={styles.expenseMonth}>{expense.date}</Text>
                      <Text style={styles.expenseDay}>{expense.day}</Text>
                    </View>

                    <View style={styles.expenseContent}>
                      <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                      <View style={styles.expenseTags}>
                        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(expense.category) }]}>
                          <Text style={styles.categoryTagText}>
                            {CATEGORIES.includes(expense.category)
                              ? t('categories.' + expense.category.toLowerCase())
                              : expense.category}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  expensesList: {
    paddingVertical: spacing.lg,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expenseDate: {
    alignItems: 'center',
    marginRight: spacing.xl,
    minWidth: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e6e6e6',
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
  expenseContent: {
    flex: 1,
    gap: spacing.sm,
  },
  expenseVendor: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  expenseTags: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  categoryTagText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: '500',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
