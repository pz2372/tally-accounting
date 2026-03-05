import React, { useContext, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, PanResponder, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getAccessToken } from '../services/authService';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getCategoryColor, CATEGORIES } from '../components/categories';
import { useSwipeBack } from '../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL
const DISMISS_BUTTON_WIDTH = 90;

interface MissingReceiptsScreenProps {
  expenses: any[];
  onBack: () => void;
  onExpensePress?: (expense: any) => void;
  isAdmin?: boolean;
  selectedOrgId?: string | null;
  onDismiss?: (expenseId: string) => void;
}

function SwipeableExpenseCard({
  expense,
  formatted,
  onPress,
  onDismiss,
  selectedOrgId,
  t,
}: {
  expense: any;
  formatted: any;
  onPress?: () => void;
  onDismiss?: (expenseId: string) => void;
  selectedOrgId?: string | null;
  t: (key: string) => string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [dismissing, setDismissing] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        // Only allow right swipe (positive dx)
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, DISMISS_BUTTON_WIDTH));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > DISMISS_BUTTON_WIDTH / 2) {
          Animated.spring(translateX, {
            toValue: DISMISS_BUTTON_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      await axios.put(
        `${API_URL}/api/expenses/${expense.id}/dismiss-receipt`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
          },
        }
      );

      // Update expense cache to mark receipt as not needed
      try {
        const orgId = selectedOrgId || await (async () => {
          const userStr = await AsyncStorage.getItem('@current_user');
          if (!userStr) return null;
          return JSON.parse(userStr).organizations?.[0]?.id;
        })();
        if (orgId) {
          const cacheKey = `@org_expenses_${orgId}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const expenses = JSON.parse(cached);
            const updated = expenses.map((e: any) =>
              e.id === expense.id ? { ...e, receiptNotNeeded: true } : e
            );
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
          }
        }
      } catch { }

      // Animate out then remove
      Animated.timing(translateX, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onDismiss?.(expense.id);
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to dismiss receipt');
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } finally {
      setDismissing(false);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Dismiss button behind the card on the left */}
      <View style={styles.dismissButtonContainer}>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss} disabled={dismissing}>
          {dismissing ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color={colors.surface} />
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Swipeable card - slides right to reveal dismiss */}
      <Animated.View style={[styles.swipeCardWrapper, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.swipeableCard}
          activeOpacity={0.7}
          onPress={onPress}
        >
          <View style={styles.expenseDate}>
            <Text style={styles.expenseMonth}>{formatted.date}</Text>
            <Text style={styles.expenseDay}>{formatted.day}</Text>
          </View>

          <View style={styles.expenseContent}>
            <Text style={styles.expenseVendor}>{formatted.vendor}</Text>
            <View style={styles.expenseTags}>
              <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(formatted.category) }]}>
                <Text style={styles.categoryTagText}>
                  {CATEGORIES.includes(formatted.category)
                    ? t('categories.' + formatted.category.toLowerCase())
                    : formatted.category}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.expenseRight}>
            <Text style={styles.expenseAmount}>${formatted.amount.toFixed(2)}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function MissingReceiptsScreen({ expenses, onBack, onExpensePress, isAdmin, selectedOrgId, onDismiss }: MissingReceiptsScreenProps) {
  const { t } = useContext(LanguageContext);
  const swipeHandlers = useSwipeBack(onBack);
  const [visibleCategoryKeys, setVisibleCategoryKeys] = useState<Set<string> | null>(null);

  // Load visible categories for employees
  useEffect(() => {
    const loadVisibleCategories = async () => {
      // Admins see all categories
      if (isAdmin) {
        setVisibleCategoryKeys(null); // null means show all
        return;
      }

      try {
        // Determine org ID
        let orgId = selectedOrgId;
        if (!orgId) {
          const userStr = await AsyncStorage.getItem('@current_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            orgId = user.organizations?.[0]?.id;
          }
        }
        if (!orgId) return;

        // Fetch categories from API to get visibility settings
        const accessToken = await getAccessToken();
        if (accessToken) {
          const response = await axios.get(`${API_URL}/api/categories`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'x-org-id': orgId,
            }
          });
          if (response.data.success && response.data.categories) {
            // Only include visible categories for employees
            const visible = new Set<string>(
              response.data.categories
                .filter((cat: any) => cat.isEnabled !== false && cat.visibleToEmployees !== false)
                .map((cat: any) => cat.key)
            );
            setVisibleCategoryKeys(visible);
          }
        }
      } catch {
        // Silently fail - show all categories if API fails
        setVisibleCategoryKeys(null);
      }
    };

    loadVisibleCategories();
  }, [isAdmin, selectedOrgId]);

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

  // Filter expenses based on category visibility
  const filteredExpenses = isAdmin || visibleCategoryKeys === null
    ? expenses
    : expenses.filter((exp: any) => visibleCategoryKeys.has(exp.categoryKey));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...(isAdmin ? {} : swipeHandlers)}>
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
          {!isAdmin && visibleCategoryKeys === null ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No Missing Receipts</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {filteredExpenses.map((raw: any) => {
                const formatted = formatExpense(raw);
                if (isAdmin) {
                  return (
                    <SwipeableExpenseCard
                      key={formatted.id}
                      expense={raw}
                      formatted={formatted}
                      onPress={() => onExpensePress?.(formatted)}
                      onDismiss={onDismiss}
                      selectedOrgId={selectedOrgId}
                      t={t}
                    />
                  );
                }
                return (
                  <TouchableOpacity
                    key={formatted.id}
                    style={styles.expenseCard}
                    activeOpacity={0.7}
                    onPress={() => onExpensePress?.(formatted)}
                  >
                    <View style={styles.expenseDate}>
                      <Text style={styles.expenseMonth}>{formatted.date}</Text>
                      <Text style={styles.expenseDay}>{formatted.day}</Text>
                    </View>

                    <View style={styles.expenseContent}>
                      <Text style={styles.expenseVendor}>{formatted.vendor}</Text>
                      <View style={styles.expenseTags}>
                        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(formatted.category) }]}>
                          <Text style={styles.categoryTagText}>
                            {CATEGORIES.includes(formatted.category)
                              ? t('categories.' + formatted.category.toLowerCase())
                              : formatted.category}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>${formatted.amount.toFixed(2)}</Text>
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
  // Swipe container
  swipeContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  dismissButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DISMISS_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.red || '#EF4444',
    borderRadius: borderRadius.lg,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dismissButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  swipeCardWrapper: {
    backgroundColor: colors.background,
  },
  swipeableCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Expense card (non-swipeable)
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
