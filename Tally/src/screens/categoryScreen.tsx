import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface ExpenseItem {
  date: string;
  day: number;
  vendor: string;
  description: string;
  amount: number;
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
}

export default function CategoryScreen({ onExpensePress }: CategoryScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [transactionCount] = useState(8);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() || 
           (selectedMonth.getFullYear() === now.getFullYear() && 
            selectedMonth.getMonth() >= now.getMonth());
  };
  
  const totalSpent = 3103.81;
  const avgPerTransaction = 387.98;
  
  const categories: CategoryData[] = [
    { 
      name: 'Software & SaaS', 
      color: colors.purple, 
      amount: 997.13, 
      expenseCount: 2,
      expenses: [
        { date: 'JAN', day: 15, vendor: 'Adobe Creative Cloud', description: 'Monthly Subscription', amount: 599.88 },
        { date: 'JAN', day: 10, vendor: 'GitHub Enterprise', description: 'Team License', amount: 397.25 },
      ]
    },
    { 
      name: 'Travel', 
      color: colors.blue, 
      amount: 812.40, 
      expenseCount: 2,
      expenses: [
        { date: 'JAN', day: 23, vendor: 'Delta Airlines', description: 'Client Meeting - NYC', amount: 523.40 },
        { date: 'JAN', day: 21, vendor: 'Hilton Hotels', description: 'Client Meeting - NYC', amount: 289.00 },
      ]
    },
    { 
      name: 'Office Supplies', 
      color: colors.gray, 
      amount: 606.78, 
      expenseCount: 2,
      expenses: [
        { date: 'JAN', day: 18, vendor: 'Staples', description: 'Office Equipment', amount: 356.50 },
        { date: 'JAN', day: 12, vendor: 'Amazon Business', description: 'Supplies & Materials', amount: 250.28 },
      ]
    },
    { 
      name: 'Marketing', 
      color: colors.red, 
      amount: 500.00, 
      expenseCount: 1,
      expenses: [
        { date: 'JAN', day: 8, vendor: 'Google Ads', description: 'Q1 Campaign', amount: 500.00 },
      ]
    },
    { 
      name: 'Meals', 
      color: colors.orange, 
      amount: 187.50, 
      expenseCount: 1,
      expenses: [
        { date: 'JAN', day: 20, vendor: 'Restaurant', description: 'Client Dinner', amount: 187.50 },
      ]
    },
  ];
  
  const maxAmount = Math.max(...categories.map(c => c.amount));

  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleCategory = (categoryName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
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
          <TouchableOpacity style={styles.compareButton}>
            <Text style={styles.compareIcon}>⇄</Text>
            <Text style={styles.compareText}>{t('category.compare')}</Text>
          </TouchableOpacity>
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
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
          <Text style={styles.categoryTitle}>By Category</Text>
          
          {categories.map((category, index) => {
            const isExpanded = expandedCategory === category.name;
            return (
              <View key={index} style={[
                styles.categoryItem,
                isExpanded && styles.categoryItemExpanded
              ]}>
                <TouchableOpacity 
                  onPress={() => toggleCategory(category.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryAmount}>${category.amount.toFixed(2)}</Text>
                      <Ionicons 
                        name="chevron-down" 
                        size={16} 
                        color={colors.textSecondary}
                        style={[styles.chevron, isExpanded && styles.chevronExpanded]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* Expanded Expense Items */}
                {isExpanded && (
                  <View style={styles.expenseList}>
                    {category.expenses.map((expense, expIndex) => (
                      <TouchableOpacity 
                        key={expIndex} 
                        style={styles.expenseItem}
                        activeOpacity={0.7}
                        onPress={() => onExpensePress && onExpensePress({
                          id: `${category.name}-${expIndex}`,
                          date: expense.date,
                          day: expense.day,
                          vendor: expense.vendor,
                          category: category.name,
                          status: 'Approved' as const,
                          amount: expense.amount,
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
          })}
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
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryAmount: {
    ...typography.heading,
    marginRight: spacing.sm,
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
});
