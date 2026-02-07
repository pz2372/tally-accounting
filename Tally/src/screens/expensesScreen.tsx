import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';

interface Expense {
  id: string;
  date: string;
  day: number;
  vendor: string;
  category: string;
  status: 'Approved' | 'Pending';
  amount: number;
}

interface ExpenseGroup {
  dateLabel: string;
  expenses: Expense[];
}

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Software & SaaS':
      return colors.purple;
    case 'Travel':
      return colors.blue;
    case 'Office Supplies':
      return colors.gray;
    case 'Meals & Drinks':
      return colors.red;
    case 'Miscellaneous':
      return colors.orange;
    default:
      return colors.gray;
  }
};

export default function ExpensesScreen({ onExpensePress }: { onExpensePress?: (expense: Expense) => void }) {
  const { t } = useContext(LanguageContext);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const expenseGroups: ExpenseGroup[] = [
    {
      dateLabel: 'THU, JAN 29',
      expenses: [
        { id: '1', date: 'JAN', day: 29, vendor: 'AWS Web Services', category: 'Software & SaaS', status: 'Approved', amount: 847.23 }
      ]
    },
    {
      dateLabel: 'WED, JAN 28',
      expenses: [
        { id: '2', date: 'JAN', day: 28, vendor: 'Zoom Video Comms', category: 'Software & SaaS', status: 'Pending', amount: 149.90 }
      ]
    },
    {
      dateLabel: 'MON, JAN 26',
      expenses: [
        { id: '3', date: 'JAN', day: 26, vendor: 'WeWork', category: 'Office Supplies', status: 'Approved', amount: 450.00 }
      ]
    },
    {
      dateLabel: 'FRI, JAN 23',
      expenses: [
        { id: '4', date: 'JAN', day: 23, vendor: 'Delta Airlines', category: 'Travel', status: 'Pending', amount: 523.40 }
      ]
    },
    {
      dateLabel: 'WED, JAN 21',
      expenses: [
        { id: '5', date: 'JAN', day: 21, vendor: 'Hilton Hotels', category: 'Travel', status: 'Pending', amount: 289.00 }
      ]
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('expenses.title')}</Text>
            <Text style={styles.subtitle}>{t('expenses.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>{selectedCategory}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchant, amount..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          onClose={() => setShowDatePicker(false)}
        />

        {/* Expense List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {expenseGroups.map((group, groupIndex) => (
            <View key={groupIndex}>
              <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeader}>{group.dateLabel}</Text>
                <View style={styles.dateHeaderLine} />
              </View>
              {group.expenses.map((expense) => (
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
                        <Text style={styles.categoryTagText}>{expense.category}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    ...commonStyles.safeArea,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
  },
  categoryButton: {
    ...commonStyles.button,
    gap: spacing.sm - 2,
  },
  categoryButtonText: {
    ...commonStyles.buttonText,
    paddingVertical: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  calendarButton: {
    backgroundColor: colors.surface,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginRight: spacing.md,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
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
  expenseContent: {
    flex: 1,
    gap: spacing.sm,
  },
  expenseVendor: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 0,
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
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextApproved: {
    color: '#10B981',
  },
  statusTextPending: {
    color: '#F59E0B',
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
