import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Pressable, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, typography, spacing, borderRadius, commonStyles } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal, { DateRange } from '../components/DatePickerModal';
import { getCategoryColor, getCategoryKey, CATEGORIES, LEGACY_CATEGORY_KEY_TO_KEY } from '../components/categories';
import { cacheOrgExpenses, getOrgCachedData, mergeExpensesById } from '../services/cacheService';
import { getAccessToken } from '../services/authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';
const EXPENSE_PAGE_DAYS = 30;
const RECEIPT_THUMB_CACHE_DIR = `${FileSystem.cacheDirectory}receipt-thumbnails/`;

type ReceiptImageSource = { uri: string; headers?: Record<string, string> };

interface Expense {
  id: string;
  date: string;
  day: number;
  vendor: string;
  category: string;
  status: 'Approved' | 'Pending';
  amount: number;
  receiptImageSource?: ReceiptImageSource;
}

interface ExpenseGroup {
  dateLabel: string;
  expenses: Expense[];
}

export default function ExpensesScreen({ onExpensePress, dataVersion = 0, selectedOrgId }: { onExpensePress?: (expense: Expense) => void; dataVersion?: number; selectedOrgId?: string | null }) {
  const { t } = useContext(LanguageContext);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(true);
  const [oldestExpenseDate, setOldestExpenseDate] = useState<Date | null>(null);
  const [receiptImageSources, setReceiptImageSources] = useState<Record<string, ReceiptImageSource>>({});
  const [viewerImageSource, setViewerImageSource] = useState<ReceiptImageSource | null>(null);
  const visibleCategoryKeysRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    loadExpenses();
  }, [dataVersion, selectedOrgId]);

  useEffect(() => {
    filterExpenses();
  }, [selectedCategory, allExpenses, selectedDate, isDateFilterActive, searchQuery, dateRange]);

  const getExpenseDate = (expense: any) => {
    const date = new Date(expense.expenseDate);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getOldestExpenseDate = (expenses: any[]) => {
    const dates = expenses
      .map(getExpenseDate)
      .filter((date): date is Date => !!date);

    if (dates.length === 0) return null;
    return new Date(Math.min(...dates.map(date => date.getTime())));
  };

  const mapExpensesForDisplay = (expenses: any[], visibleCategoryKeys = visibleCategoryKeysRef.current) => {
    const normalizeCategoryKey = (key?: string | null) => key ? (LEGACY_CATEGORY_KEY_TO_KEY[key] || key) : '';

    return expenses
      .filter((exp: any) => {
        if (exp.deletedAt) return false;
        if (!visibleCategoryKeys) return true;
        const categoryKey = normalizeCategoryKey(exp.categoryKey || getCategoryKey(exp.categoryNameSnapshot || ''));
        return visibleCategoryKeys.has(categoryKey);
      })
      .map((exp: any) => {
        const expenseDate = new Date(exp.expenseDate);
        const categoryName = exp.categoryNameSnapshot || 'Other Expenses';

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
          receiptUrl: exp.receiptUrl,
        };
      })
      .sort((a: any, b: any) => b.fullDate.getTime() - a.fullDate.getTime());
  };

  const getDateWindow = (endDate: Date) => {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - EXPENSE_PAGE_DAYS);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  };

  const fetchExpenseWindow = async (orgId: string, startDate: Date, endDate: Date) => {
    const accessToken = await getAccessToken();
    if (!accessToken) return [];

    const response = await axios.get(`${API_URL}/api/expenses`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-org-id': orgId,
      },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    return response.data.success && Array.isArray(response.data.expenses)
      ? response.data.expenses
      : [];
  };

  const getReceiptThumbCacheUri = (expense: any) => {
    const versionDate = expense.updatedAt || expense.createdAt || expense.expenseDate || '';
    const version = new Date(versionDate).getTime();
    return `${RECEIPT_THUMB_CACHE_DIR}${expense.id}-${Number.isNaN(version) ? 'current' : version}.jpg`;
  };

  const loadReceiptImages = async (orgId: string, expenses: any[]) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const newestWindowStart = new Date();
      newestWindowStart.setDate(newestWindowStart.getDate() - EXPENSE_PAGE_DAYS);
      newestWindowStart.setHours(0, 0, 0, 0);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'x-org-id': orgId,
      };

      const expensesWithReceipts = expenses.filter((expense: any) => {
        const expenseDate = getExpenseDate(expense);
        return expense?.id && expense?.receiptUrl && expenseDate && expenseDate >= newestWindowStart;
      });

      await FileSystem.makeDirectoryAsync(RECEIPT_THUMB_CACHE_DIR, { intermediates: true }).catch(() => {});

      const missingDownloads: Array<{ expense: any; uri: string }> = [];
      const cachedSources: Record<string, ReceiptImageSource> = {};

      await Promise.all(expensesWithReceipts.map(async (expense: any) => {
        const uri = getReceiptThumbCacheUri(expense);
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          cachedSources[expense.id] = { uri };
        } else {
          missingDownloads.push({ expense, uri });
        }
      }));

      setReceiptImageSources(cachedSources);

      const downloadOne = async ({ expense, uri }: { expense: any; uri: string }) => {
        const remoteUri = `${API_URL}/api/expenses/${expense.id}/image`;
        const result = await FileSystem.downloadAsync(remoteUri, uri, { headers });
        setReceiptImageSources(prev => ({
          ...prev,
          [expense.id]: { uri: result.uri },
        }));
      };

      const workers = Array.from({ length: Math.min(3, missingDownloads.length) }, async (_, workerIndex) => {
        for (let index = workerIndex; index < missingDownloads.length; index += 3) {
          await downloadOne(missingDownloads[index]).catch(() => {});
        }
      });

      await Promise.all(workers);
    } catch {
      setReceiptImageSources({});
    }
  };

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      setReceiptImageSources({});

      // Determine org ID and user role
      let orgId = selectedOrgId;
      let userRole = 'EMPLOYEE'; // default to employee for privacy

      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) {
        setIsLoading(false);
        return;
      }
      const user = JSON.parse(userStr);

      if (!orgId) {
        orgId = user.organizations?.[0]?.id;
      }
      if (!orgId) {
        setIsLoading(false);
        return;
      }
      setCurrentOrgId(orgId);
      setHasMoreExpenses(true);
      setOldestExpenseDate(null);

      // Get user's role for this org
      const org = user.organizations?.find((o: any) => o.id === orgId);
      if (org?.role) {
        userRole = org.role;
      }

      // Load org data from cache
      const orgData = await getOrgCachedData(orgId);
      const { expenses } = orgData || {};

      // Fetch categories from API to respect visibility settings
      let apiCategories: any[] = [];
      try {
        const accessToken = await getAccessToken();
        if (accessToken) {
          const response = await axios.get(`${API_URL}/api/categories`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-org-id': orgId,
            }
          });
          if (response.data.success && response.data.categories) {
            // Map API response to category format
            // For employees, only include visible categories; admins see all enabled categories
            apiCategories = response.data.categories
              .filter((cat: any) => {
                const isEnabled = cat.isEnabled !== false;
                const isVisible = cat.visibleToEmployees !== false;
                return isEnabled && (userRole === 'ADMIN' || isVisible);
              })
              .map((cat: any) => ({
                id: cat.key,
                preset: {
                  name: cat.name,
                },
                key: cat.key,
              }));
          }
        }
      } catch {
        // Silently fall back to preset categories if API fails
      }

      // Use API categories if available, otherwise use preset categories
      const allCategories = apiCategories.length > 0 ? apiCategories :
        CATEGORIES.map((categoryName: string, index: number) => ({
          id: getCategoryKey(categoryName) || `preset-${index}`,
          key: getCategoryKey(categoryName),
          preset: {
            name: categoryName,
          },
        }));

      // Admins should see every expense returned by the server. Employees are limited
      // to categories visible to employees when category settings are available.
      const visibleCategoryKeys = userRole === 'ADMIN'
        ? null
        : new Set(allCategories.map((cat: any) => LEGACY_CATEGORY_KEY_TO_KEY[cat.key || cat.id] || cat.key || cat.id));
      visibleCategoryKeysRef.current = visibleCategoryKeys;

      setCategories(allCategories);

      let cachedExpenses = Array.isArray(expenses) ? expenses : [];

      const { startDate, endDate } = getDateWindow(new Date());
      try {
        const latestExpenses = await fetchExpenseWindow(orgId, startDate, endDate);
        cachedExpenses = await cacheOrgExpenses(orgId, latestExpenses, { replace: true });
        setHasMoreExpenses(latestExpenses.length > 0);
      } catch {
        setHasMoreExpenses(cachedExpenses.length > 0);
      }

      // Filter out deleted expenses and map to UI format
      const validExpenses = mapExpensesForDisplay(cachedExpenses, visibleCategoryKeys);

      setOldestExpenseDate(getOldestExpenseDate(cachedExpenses));
      setAllExpenses(validExpenses);
      setRawExpenses(cachedExpenses);
      loadReceiptImages(orgId, cachedExpenses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
      setAllExpenses([]);
      setExpenseGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderExpenses = async () => {
    if (!currentOrgId || isLoading || isLoadingMore || !hasMoreExpenses) return;

    try {
      setIsLoadingMore(true);
      const endDate = oldestExpenseDate ? new Date(oldestExpenseDate.getTime() - 1) : new Date();
      const { startDate } = getDateWindow(endDate);
      const olderExpenses = await fetchExpenseWindow(currentOrgId, startDate, endDate);

      if (olderExpenses.length === 0) {
        setHasMoreExpenses(false);
        return;
      }

      const mergedExpenses = mergeExpensesById(rawExpenses, olderExpenses);

      setOldestExpenseDate(getOldestExpenseDate(mergedExpenses));
      setRawExpenses(mergedExpenses);
      setAllExpenses(mapExpensesForDisplay(mergedExpenses));
      setHasMoreExpenses(olderExpenses.length > 0);
    } catch {
      // Keep the current cached list visible if loading older history fails.
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = ({ nativeEvent }: any) => {
    const paddingToBottom = 32;
    const isNearBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
      nativeEvent.contentSize.height - paddingToBottom;

    if (isNearBottom) {
      loadOlderExpenses();
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

    // Filter by date range or single date
    if (dateRange) {
      const start = dateRange.startDate.getTime();
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      const endTs = end.getTime();
      filtered = filtered.filter((exp: any) => {
        const t = exp.fullDate.getTime();
        return t >= start && t <= endTs;
      });
    } else if (isDateFilterActive) {
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

    // Convert to ExpenseGroup array with formatted date labels, sorted most recent first
    const groups: ExpenseGroup[] = Object.entries(grouped)
      .map(([dateKey, expenses]: [string, any]) => {
        const date = new Date(dateKey);
        const dateLabel = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }).toUpperCase();

        return {
          dateLabel,
          expenses,
          _sortDate: date,
        };
      })
      .sort((a: any, b: any) => b._sortDate.getTime() - a._sortDate.getTime())
      .map(({ _sortDate, ...group }: any) => group);

    setExpenseGroups(groups);
  };

  const onDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsDateFilterActive(true);
    setDateRange(null);
  };

  const handleResetDate = () => {
    setIsDateFilterActive(false);
    setDateRange(null);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setIsDateFilterActive(false);
  };

  const getExpenseWithReceiptImage = (expense: any) => ({
    ...expense,
    receiptImageSource: receiptImageSources[expense.id],
  });

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
          onDateRangeChange={handleDateRangeChange}
        />

        {/* Expense List */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
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
            expenseGroups.map((group) => (
            <View key={group.dateLabel}>
              <View style={styles.dateHeaderContainer}>
                <Text style={styles.dateHeader}>{group.dateLabel}</Text>
                <View style={styles.dateHeaderLine} />
              </View>
              {group.expenses.map((expense) => (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.expenseCard}
                  activeOpacity={0.7}
                  onPress={() => onExpensePress?.(getExpenseWithReceiptImage(expense))}
                >
                  <TouchableOpacity
                    style={styles.receiptThumbnail}
                    activeOpacity={receiptImageSources[expense.id] ? 0.8 : 1}
                    onPress={(event) => {
                      const imageSource = receiptImageSources[expense.id];
                      if (imageSource) {
                        event.stopPropagation();
                        setViewerImageSource(imageSource);
                        return;
                      }

                      onExpensePress?.(getExpenseWithReceiptImage(expense));
                    }}
                  >
                    {receiptImageSources[expense.id] ? (
                      <Image
                        source={receiptImageSources[expense.id]}
                        style={styles.receiptThumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="receipt-outline" size={22} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                  
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
          {isLoadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
        <Modal
          visible={!!viewerImageSource}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerImageSource(null)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setViewerImageSource(null)}
            >
              <Ionicons name="close-circle" size={36} color="white" />
            </TouchableOpacity>
            <ScrollView
              style={styles.imageViewerScroll}
              contentContainerStyle={styles.imageViewerContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              bouncesZoom
            >
              {viewerImageSource && (
                <Image
                  source={viewerImageSource}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
          </View>
        </Modal>
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
  loadingMoreContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
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
  receiptThumbnail: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  receiptThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
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
