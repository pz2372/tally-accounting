import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Dimensions, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getOrgCachedData } from '../services/cacheService';
import { createAuthenticatedAxios } from '../services/authService';
import NewExpenseScreen from './newExpenseScreen';
import UploadStatementScreen from './uploadStatementScreen';
import NeedsAttentionScreen from './needsAttentionScreen';
import StatementsScreen from './statementsScreen';
import RecurringScreen from './recurringScreen';
import SalesReportScreen from './salesReportScreen';
import MissingReceiptsScreen from './missingReceiptsScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HOME_METRICS_KEY = '@home_metrics';
const SELECTED_BUSINESS_KEY = '@selected_business_id';

interface HomeMetrics {
  totalSpent: number;
  grossSales: number;
  netSales: number;
  capturedReceipts: number;
  totalTransactions: number;
  unmatchedItems: number;
}

const defaultMetrics: HomeMetrics = {
  totalSpent: 0,
  grossSales: 0,
  netSales: 0,
  capturedReceipts: 0,
  totalTransactions: 0,
  unmatchedItems: 0
};

interface HomeScreenProps {
  onSettingsPress: () => void;
  onOverlayChange?: (hasOverlay: boolean) => void;
  hasOrganization: boolean;
  onCreateOrganization?: () => void;
  onDataChanged?: () => void;
  onOrgChange?: (orgId: string) => void;
  onExpensePress?: (expense: any) => void;
  currentUser?: {
    name?: string;
    email?: string;
    organizations?: Array<{ id: string; name: string; dba?: string; role?: string }>;
  } | null;
}

export default function HomeScreen({
  onSettingsPress,
  onOverlayChange,
  hasOrganization,
  onCreateOrganization,
  onDataChanged,
  onOrgChange,
  onExpensePress,
  currentUser
}: HomeScreenProps) {
  const { t } = useContext(LanguageContext);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'home' | 'newExpense' | 'uploadStatement' | 'needsAttention' | 'statements' | 'recurring' | 'salesReport' | 'sales' | 'missingReceipts'>('home');
  const [metrics, setMetrics] = useState<HomeMetrics>(defaultMetrics);
  const [missingReceiptExpenses, setMissingReceiptExpenses] = useState<any[]>([]);
  const [isLoadingOrgData, setIsLoadingOrgData] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    if (activeScreen !== 'home') {
      // Notify parent that overlay is active
      onOverlayChange?.(true);
      // Slide in from right
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Notify parent that overlay is closed
      onOverlayChange?.(false);
      // Reset position for next animation
      slideAnim.setValue(SCREEN_WIDTH);
    }
  }, [activeScreen]);

  // Load saved business ID on app start
  useEffect(() => {
    const loadSelectedBusiness = async () => {
      try {
        const saved = await AsyncStorage.getItem(SELECTED_BUSINESS_KEY);
        if (saved) {
          setSelectedBusinessId(saved);
          onOrgChange?.(saved);
        }
      } catch (error) {
        console.warn('Failed to load selected business:', error);
      }
    };
    loadSelectedBusiness();
  }, []);

  // Save business ID whenever it changes
  useEffect(() => {
    if (selectedBusinessId) {
      AsyncStorage.setItem(SELECTED_BUSINESS_KEY, selectedBusinessId).catch(error => {
        console.warn('Failed to save selected business:', error);
      });
    }
  }, [selectedBusinessId]);

  const handleBack = () => {
    // Slide out to right
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveScreen('home');
    });
  };

  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === selectedBusinessId) return;

    setShowBusinessDropdown(false);
    setIsLoadingOrgData(true);

    try {
      const api = await createAuthenticatedAxios();

      // Fetch all org data in parallel
      const [expensesRes, categoriesRes, statementsRes, recurringRes, receiptsRes, matchesRes, salesRes] = await Promise.all([
        api.get('/api/expenses', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { expenses: [] } })),
        api.get('/api/categories', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { categories: [] } })),
        api.get('/api/statements', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { statements: [] } })),
        api.get('/api/recurring-charges', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { charges: [] } })),
        api.get('/api/receipts', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { receipts: [] } })),
        api.get('/api/matches', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { matches: [] } })),
        api.get('/api/sales-reports', { headers: { 'x-org-id': orgId } }).catch(() => ({ data: { reports: [] } })),
      ]);

      // Cache the org data
      const CACHE_KEYS = {
        ORG_EXPENSES: '@org_expenses_',
        ORG_CATEGORIES: '@org_categories_',
        ORG_STATEMENTS: '@org_statements_',
        ORG_RECURRING_CHARGES: '@org_recurring_charges_',
        ORG_RECEIPTS: '@org_receipts_',
        ORG_RECEIPT_MATCHES: '@org_receipt_matches_',
        ORG_SALES_REPORTS: '@org_sales_reports_',
      };

      await Promise.all([
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_EXPENSES}${orgId}`, JSON.stringify(expensesRes.data.expenses || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_CATEGORIES}${orgId}`, JSON.stringify(categoriesRes.data.categories || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_STATEMENTS}${orgId}`, JSON.stringify(statementsRes.data.statements || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_RECURRING_CHARGES}${orgId}`, JSON.stringify(recurringRes.data.charges || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_RECEIPTS}${orgId}`, JSON.stringify(receiptsRes.data.receipts || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_RECEIPT_MATCHES}${orgId}`, JSON.stringify(matchesRes.data.matches || [])),
        AsyncStorage.setItem(`${CACHE_KEYS.ORG_SALES_REPORTS}${orgId}`, JSON.stringify(salesRes.data.reports || [])),
      ]);

      // Switch org and trigger refresh
      setSelectedBusinessId(orgId);
      onOrgChange?.(orgId);
      onDataChanged?.();
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsLoadingOrgData(false);
    }
  };

  const businesses = currentUser?.organizations || [];
  const hasMultipleBusinesses = businesses.length > 1;

  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) {
      setSelectedBusinessId(businesses[0].id);
      onOrgChange?.(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  useEffect(() => {
    let isActive = true;

    const loadMetrics = async () => {
      try {
        let nextMetrics = defaultMetrics;

        // Try to load from cache first
        const raw = await AsyncStorage.getItem(HOME_METRICS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);

          if (selectedBusinessId && parsed?.byOrg?.[selectedBusinessId]) {
            nextMetrics = {
              ...defaultMetrics,
              ...parsed.byOrg[selectedBusinessId]
            };
          } else if (parsed && typeof parsed === 'object') {
            nextMetrics = {
              ...defaultMetrics,
              ...parsed
            };
          }
        }

        // Always compute current metrics from org data
        if (selectedBusinessId) {
          const orgData = await getOrgCachedData(selectedBusinessId);
          if (orgData?.expenses && Array.isArray(orgData.expenses)) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const expenseTotal = orgData.expenses.reduce((sum: number, expense: any) => {
              if (expense.deletedAt) return sum;
              const expenseDate = new Date(expense.expenseDate);
              if (expenseDate.getMonth() !== currentMonth || expenseDate.getFullYear() !== currentYear) {
                return sum;
              }
              return sum + (expense.amountCents / 100);
            }, 0);
            nextMetrics.totalSpent = expenseTotal;

            // Calculate count of expenses missing receipts for current month
            const receiptMatches = orgData.receiptMatches || [];
            const expensesWithReceipts = new Set(receiptMatches.map((m: any) => m.expenseId));

            const missingReceiptsData: any[] = [];
            const missingReceiptCount = orgData.expenses.reduce((count: number, expense: any) => {
              if (expense.deletedAt) return count;
              const expenseDate = new Date(expense.expenseDate);
              if (expenseDate.getMonth() !== currentMonth || expenseDate.getFullYear() !== currentYear) {
                return count;
              }
              // Only count if expense doesn't have a receipt match
              if (!expensesWithReceipts.has(expense.id)) {
                missingReceiptsData.push(expense);
                return count + 1;
              }
              return count;
            }, 0);
            nextMetrics.unmatchedItems = missingReceiptCount;

            if (isActive) {
              setMissingReceiptExpenses(missingReceiptsData);
            }
          }

          // Fetch gross/net sales and statement matching data
          try {
            const api = await createAuthenticatedAxios();
            const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const [salesRes, statementsRes] = await Promise.all([
              api.get('/api/sales-reports/monthly-summary', {
                params: { month: monthKey },
                headers: { 'x-org-id': selectedBusinessId },
              }).catch(() => null),
              api.get('/api/statements', {
                params: { statementMonth: monthKey },
                headers: { 'x-org-id': selectedBusinessId },
              }).catch(() => null),
            ]);

            if (salesRes?.data.success && salesRes.data.summary) {
              nextMetrics.grossSales = salesRes.data.summary.grossSalesCents / 100;
              nextMetrics.netSales = salesRes.data.summary.netSalesCents / 100;
            }

            // Compute statement matching metrics
            if (statementsRes?.data.success && statementsRes.data.statements) {
              let totalTxns = 0;
              let matchedTxns = 0;
              for (const stmt of statementsRes.data.statements) {
                totalTxns += stmt._count?.transactions || 0;
                matchedTxns += stmt.matchedTransactions || 0;
              }
              nextMetrics.totalTransactions = totalTxns;
              nextMetrics.capturedReceipts = matchedTxns;
            }
          } catch (err) {
            console.warn('Failed to fetch sales/statement data for home:', err);
          }
        }

        if (isActive) {
          setMetrics(nextMetrics);
        }
      } catch (error) {
        console.warn('Failed to load home metrics cache:', error);
      }
    };

    loadMetrics();

    return () => {
      isActive = false;
    };
  }, [selectedBusinessId]);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const businessName = selectedBusiness?.dba || selectedBusiness?.name || 'Organization';
  const businessLegalName = selectedBusiness?.dba ? selectedBusiness.name : null;
  const isEmployee = selectedBusiness?.role === 'EMPLOYEE';
  const totalSpent = metrics.totalSpent;
  const grossSales = metrics.grossSales;
  const netSales = metrics.netSales;
  const thisMonthExpenses = totalSpent;
  const capturedReceipts = metrics.capturedReceipts;
  const totalTransactions = metrics.totalTransactions;
  const unmatchedItems = metrics.unmatchedItems;

  // Get locale from language context
  const getLocale = () => {
    switch (t('nav.home')) {
      case 'Inicio': return 'es'; // Spanish
      case '\u4e3b\u9875': return 'zh'; // Chinese
      default: return 'en'; // English
    }
  };
  const locale = getLocale();
  const currentMonthLabel = new Date().toLocaleString(locale, { month: 'long', year: 'numeric' });
  const capitalize = (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : value);
  const getInitials = (value?: string) => {
    if (!value) return 'U';
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const userInitials = getInitials(currentUser?.name || currentUser?.email);

  if (!hasOrganization) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <TouchableOpacity style={styles.avatarButton} onPress={onSettingsPress}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Create an organization</Text>
            <Text style={styles.emptySubtitle}>Add your first organization to unlock expenses, capture, and categories.</Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={onCreateOrganization}
              disabled={!onCreateOrganization}
            >
              <Text style={styles.emptyActionText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render overlay screen
  const renderOverlayScreen = () => {
    if (activeScreen === 'home') return null;

    let ScreenComponent;
    switch (activeScreen) {
      case 'newExpense':
        ScreenComponent = <NewExpenseScreen onBack={() => { onDataChanged?.(); handleBack(); }} selectedOrgId={selectedBusinessId} />;
        break;
      case 'uploadStatement':
        ScreenComponent = <UploadStatementScreen onBack={handleBack} selectedOrgId={selectedBusinessId} />;
        break;
      case 'needsAttention':
        ScreenComponent = <NeedsAttentionScreen onBack={handleBack} />;
        break;
      case 'statements':
        ScreenComponent = <StatementsScreen onBack={handleBack} onNavigate={(screen) => setActiveScreen(screen as any)} selectedOrgId={selectedBusinessId} />;
        break;
      case 'recurring':
        ScreenComponent = <RecurringScreen onBack={handleBack} selectedOrgId={selectedBusinessId} />;
        break;
      case 'salesReport':
        ScreenComponent = <SalesReportScreen onBack={handleBack} selectedOrgId={selectedBusinessId} />;
        break;
      case 'sales':
        ScreenComponent = <SalesReportScreen onBack={handleBack} selectedOrgId={selectedBusinessId} />;
        break;
      case 'missingReceipts':
        ScreenComponent = <MissingReceiptsScreen expenses={missingReceiptExpenses} onBack={handleBack} onExpensePress={onExpensePress} />;
        break;
      default:
        return null;
    }

    return (
      <Animated.View style={[styles.overlayScreen, { transform: [{ translateX: slideAnim }] }]}>
        {ScreenComponent}
      </Animated.View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{t('home.welcomeBack')}</Text>
              <TouchableOpacity
                style={styles.businessNameButton}
                onPress={() => hasMultipleBusinesses && setShowBusinessDropdown(!showBusinessDropdown)}
                disabled={!hasMultipleBusinesses}
              >
                <View>
                  <View style={styles.businessNameRow}>
                    <Text style={styles.businessName}>{businessName}</Text>
                    {hasMultipleBusinesses && (
                      <Ionicons
                        name={showBusinessDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.textPrimary}
                      />
                    )}
                  </View>
                  {businessLegalName && (
                    <Text style={styles.businessLegalName}>{businessLegalName}</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Business Dropdown Menu */}
              {showBusinessDropdown && hasMultipleBusinesses && (
                <View style={styles.businessDropdown}>
                  {businesses.map((business) => (
                    <TouchableOpacity
                      key={business.id}
                      style={[
                        styles.businessDropdownItem,
                        selectedBusinessId === business.id && styles.businessDropdownItemActive
                      ]}
                      onPress={() => handleOrgSwitch(business.id)}
                      disabled={isLoadingOrgData}
                    >
                      <View style={styles.businessDropdownItemContent}>
                        <View>
                          <Text style={[
                            styles.businessDropdownText,
                            selectedBusinessId === business.id && styles.businessDropdownTextActive
                          ]}>
                            {business.dba || business.name}
                          </Text>
                          {business.dba && (
                            <Text style={styles.businessDropdownSubtext}>{business.name}</Text>
                          )}
                        </View>
                      </View>
                      {selectedBusinessId === business.id && (
                        <View style={styles.checkmarkCircle}>
                          <Ionicons name="checkmark" size={16} color="#0f172a" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={onSettingsPress}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Financial Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewLabel}>{t('home.netSales')}</Text>
            </View>
            <Text style={styles.overviewValue}>${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={styles.overviewPeriod}>{currentMonthLabel}</Text>

            <View style={styles.overviewStatsGrid}>
              <View style={styles.overviewStatLeft}>
                <Text style={styles.overviewStatLabel}>{t('home.grossSales')}</Text>
                <Text style={styles.overviewStatValueLarge}>${grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewStatRight}>
                <View style={styles.overviewStatRightItem}>
                  <Text style={styles.overviewStatLabel}>{capitalize(t('home.expenses'))}</Text>
                  <Text style={styles.overviewStatValueLarge}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          {!isEmployee && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('statements')}>
              <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.actionLabel}>{t('home.statements')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('recurring')}>
              <Ionicons name="repeat-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.actionLabel}>{t('home.recurring')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('sales')}>
              <Ionicons name="trending-up-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.actionLabel}>{t('home.sales')}</Text>
            </TouchableOpacity>
          </View>
          )}

          {/* New Expense Button */}
          <TouchableOpacity style={styles.newExpenseButton} onPress={() => setActiveScreen('newExpense')}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
            <Text style={styles.newExpenseText}>{t('home.newExpense')}</Text>
          </TouchableOpacity>

          {/* Upload Statement Button */}
          <TouchableOpacity style={styles.uploadStatementButton} onPress={() => setActiveScreen('uploadStatement')}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
            <Text style={styles.uploadStatementText}>{t('home.newStatement')}</Text>
          </TouchableOpacity>

          {/* Receipt Tracking Card */}
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <Text style={styles.trackingTitle}>
                <Text>
                {t('home.receiptTracking')}
                </Text>
                <Text style={styles.trackingByText}>  with</Text>
              </Text>
              <Image source={require('../../assets/ai-logo.png')} style={styles.trackingAiLogo} />
            </View>

            <View style={styles.trackingRow}>
              <View style={styles.trackingStat}>
                <Text style={styles.trackingValue}>{capturedReceipts}/{totalTransactions}</Text>
                <Text style={styles.trackingLabel}>{t('home.matched')}</Text>
              </View>
              <View style={styles.trackingDivider} />
              <TouchableOpacity
                style={styles.trackingStat}
                onPress={() => {
                  if (unmatchedItems > 0) {
                    setActiveScreen('missingReceipts');
                  }
                }}
                disabled={unmatchedItems === 0}
              >
                <Text style={[styles.trackingValue, unmatchedItems > 0 && styles.trackingValueWarning]}>{unmatchedItems}</Text>
                <Text style={styles.trackingLabel}>{t('home.unmatchedLabel')}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
      {renderOverlayScreen()}

      {/* Loading Overlay for Org Switch */}
      <Modal
        visible={isLoadingOrgData}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
    </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerLeft: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.2,
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  businessNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  businessLegalName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  businessDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 0,

    paddingVertical: spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 1000,
  },
  businessDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xs,
    marginVertical: 2,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  businessDropdownItemActive: {
    backgroundColor: '#f1f5f9',
  },
  businessDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  businessDropdownTextActive: {
    fontWeight: '700',
    color: '#0f172a',
  },
  businessDropdownSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  avatarButton: {
    marginLeft: spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  overviewCard: {
    backgroundColor: '#0f172a',
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overviewLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  profitBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
  },
  overviewValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -1,
    marginBottom: 4,
  },
  overviewPeriod: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.lg,
  },
  overviewStatsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  overviewStatLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  overviewStatRight: {
    flex: 1,
    gap: spacing.md,
  },
  overviewStatRightItem: {
    flex: 1,
  },
  overviewStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontWeight: '500',
  },
  overviewStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  overviewStatValueLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: -0.5,
  },
  overviewDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  newExpenseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newExpenseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  uploadStatementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadStatementText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trackingCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trackingByText: {
    fontWeight: '500',
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  trackingAiLogo: {
    width: 65,
    height: 30,
  },
  trackingRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  trackingStat: {
    flex: 1,
    alignItems: 'center',
  },
  trackingValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  trackingValueWarning: {
    color: colors.red,
  },
  trackingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  trackingDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  needsAttentionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  needsAttentionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  needsAttentionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needsAttentionContent: {
    flex: 1,
  },
  needsAttentionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  needsAttentionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overlayScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
