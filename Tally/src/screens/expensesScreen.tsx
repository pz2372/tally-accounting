import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';
import { getCategoryColor, CATEGORIES } from '../components/categories';
import { getOrgCachedData } from '../services/cacheService';

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

export default function ExpensesScreen({ onExpensePress }: { onExpensePress?: (expense: Expense) => void }) {
  const { t } = useContext(LanguageContext);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [selectedCategory, allExpenses, selectedDate, isDateFilterActive, searchQuery]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      
      // Get user to find first org ID
      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) {
        console.log('No user found in cache');
        setIsLoading(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      const firstOrgId = user.organizations?.[0]?.id;
      if (!firstOrgId) {
        console.log('No organization found for user');
        setIsLoading(false);
        return;
      }

      // Load org data from cache
      const orgData = await getOrgCachedData(firstOrgId);
      const { expenses, categories: orgCategories } = orgData || {};

      // Combine preset categories from categories.ts with orgCategories from cache
      const presetMapped = CATEGORIES.map((categoryName: string, index: number) => ({
        id: `preset-${index}`,
        preset: {
          name: categoryName,
        },
      }));
      
      // Add org-specific categories from cache
      const allCategories = [...presetMapped];
      if (orgCategories && Array.isArray(orgCategories)) {
        allCategories.push(...orgCategories);
      }
      
      setCategories(allCategories);

      if (!expenses || !Array.isArray(expenses)) {
        setAllExpenses([]);
        setExpenseGroups([]);
        setIsLoading(false);
        return;
      }

      // Filter out deleted expenses and map to UI format
      const validExpenses = expenses
        .filter((exp: any) => !exp.deletedAt)
        .map((exp: any) => {
          const expenseDate = new Date(exp.expenseDate);
          const orgCat = orgCategories?.find((c: any) => c.id === exp.orgCategoryId);
          const categoryName = exp.categoryNameSnapshot || orgCat?.preset?.name || 'Miscellaneous';
          
          return {
            id: exp.id,
            date: expenseDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            day: expenseDate.getDate(),
            vendor: exp.merchant || 'Unknown',
            category: categoryName,
            status: 'Approved' as const,
            amount: exp.amountCents / 100,
            fullDate: expenseDate,
            paymentMethod: exp.paymentMethod,
            orgCategoryId: exp.orgCategoryId,
            notes: exp.notes,
          };
        })
        .sort((a: any, b: any) => b.fullDate.getTime() - a.fullDate.getTime());

      setAllExpenses(validExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setAllExpenses([]);
      setExpenseGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterExpenses = () => {
    if (allExpenses.length === 0) {
      setExpenseGroups([]);
      return;
    }

    // Filter expenses based on selected category
    let filtered = selectedCategory === 'All Categories' 
      ? allExpenses 
      : allExpenses.filter((exp: any) => exp.category === selectedCategory);

    // Filter by selected date only if date filter is active
    if (isDateFilterActive) {
      const selectedDateStr = selectedDate.toDateString();
      filtered = filtered.filter((exp: any) => exp.fullDate.toDateString() === selectedDateStr);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((exp: any) => {
        // Search by vendor
        const vendorMatch = exp.vendor.toLowerCase().includes(query);
        
        // Search by amount (convert to string, search both with and without $)
        const amountStr = exp.amount.toString();
        const amountMatch = amountStr.includes(query) || query.replace('$', '').includes(amountStr);
        
        // Search by category
        const categoryMatch = exp.category.toLowerCase().includes(query);
        
        // Search by date (formatted date)
        const dateStr = exp.fullDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }).toLowerCase();
        const dateMatch = dateStr.includes(query);
        
        return vendorMatch || amountMatch || categoryMatch || dateMatch;
      });
    }

    // Group by date
    const grouped = filtered.reduce((acc: { [key: string]: Expense[] }, expense: any) => {
      const dateKey = expense.fullDate.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(expense);
      return acc;
    }, {});

    // Convert to ExpenseGroup array with formatted date labels
    const groups: ExpenseGroup[] = Object.entries(grouped).map(([dateKey, expenses]: [string, any]) => {
      const date = new Date(dateKey);
      const dateLabel = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }).toUpperCase();
      
      return {
        dateLabel,
        expenses,
      };
    });

    setExpenseGroups(groups);
  };

  const onDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsDateFilterActive(true);
  };

  const handleResetDate = () => {
    setIsDateFilterActive(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View 
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('expenses.title')}</Text>
            <Text style={styles.subtitle}>{t('expenses.subtitle')}</Text>
          </View>
          <View>
            <TouchableOpacity 
              style={styles.categoryButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.categoryButtonText}>
                {selectedCategory === 'All Categories' 
                  ? t('expenses.allCategories') 
                  : CATEGORIES.includes(selectedCategory)
                    ? t('categories.' + selectedCategory.toLowerCase())
                    : selectedCategory}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            
            {/* Category Dropdown */}
            {showCategoryPicker && (
              <Pressable 
                style={styles.categoryDropdown}
                onPress={(e) => e.stopPropagation()}
              >
                <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[
                      styles.categoryDropdownItem,
                      selectedCategory === 'All Categories' && styles.categoryDropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory('All Categories');
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.categoryDropdownItemText,
                      selectedCategory === 'All Categories' && styles.categoryDropdownItemTextSelected
                    ]}>
                      {t('expenses.allCategories')}
                    </Text>
                    {selectedCategory === 'All Categories' && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {categories.map((cat: any) => {
                    const categoryName = cat.preset?.name || cat.name || cat.categoryName || 'Unnamed Category';
                    const isPresetCategory = CATEGORIES.includes(categoryName);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryDropdownItem,
                          selectedCategory === categoryName && styles.categoryDropdownItemSelected
                        ]}
                        onPress={() => {
                          setSelectedCategory(categoryName);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <View style={styles.categoryDropdownItemContent}>
                          <View style={[
                            styles.categoryColorDot,
                            { backgroundColor: getCategoryColor(categoryName) }
                          ]} />
                          <Text style={[
                            styles.categoryDropdownItemText,
                            selectedCategory === categoryName && styles.categoryDropdownItemTextSelected
                          ]}>
                            {isPresetCategory ? t('categories.' + categoryName.toLowerCase()) : categoryName}
                          </Text>
                        </View>
                        {selectedCategory === categoryName && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Pressable>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('expenses.search')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
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
          onReset={handleResetDate}
        />

        {/* Expense List */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => showCategoryPicker && setShowCategoryPicker(false)}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : expenseGroups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No expenses</Text>
            </View>
          ) : (
            expenseGroups.map((group, groupIndex) => (
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
              ))}
            </View>
          ))
          )}
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
    position: 'relative',
    zIndex: 10,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
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
  categoryDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 200,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    overflow: 'hidden',
  },
  categoryDropdownScroll: {
    maxHeight: 300,
  },
  categoryDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryDropdownItemSelected: {
    backgroundColor: colors.background,
  },
  categoryDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryDropdownItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryDropdownItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
