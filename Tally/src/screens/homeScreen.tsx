import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import NewExpenseScreen from './newExpenseScreen';
import UploadStatementScreen from './uploadStatementScreen';
import NeedsAttentionScreen from './needsAttentionScreen';
import StatementsScreen from './statementsScreen';
import RecurringScreen from './recurringScreen';
import SalesReportScreen from './salesReportScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  onSettingsPress: () => void;
  onOverlayChange?: (hasOverlay: boolean) => void;
}

export default function HomeScreen({ onSettingsPress, onOverlayChange }: HomeScreenProps) {
  const { t } = useContext(LanguageContext);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState("Acme Corporation");
  const [activeScreen, setActiveScreen] = useState<'home' | 'newExpense' | 'uploadStatement' | 'needsAttention' | 'statements' | 'recurring' | 'salesReport'>('home');
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
  
  const businesses = [
    { id: 1, name: "Acme Corporation" },
    { id: 2, name: "Tech Innovations LLC" },
    { id: 3, name: "Digital Solutions Inc" },
  ];
  
  const businessName = selectedBusiness;
  const totalSpent = 34103.81;
  const totalSales = 122450.00;
  const netProfit = totalSales - totalSpent;
  const profitMargin = ((netProfit / totalSales) * 100).toFixed(1);
  const thisMonthExpenses = totalSpent;
  const capturedReceipts = 83;
  const totalTransactions = 92;
  const unmatchedItems = 7;
  const userInitials = "AC";

  // Action alerts - only show when there are issues
  const alerts = [
    { id: 1, message: '5 statement charges missing receipts', icon: 'receipt-outline' },
    { id: 2, message: '2 receipts not matched to a charge', icon: 'link-outline' },
  ];

  // Render overlay screen
  const renderOverlayScreen = () => {
    if (activeScreen === 'home') return null;
    
    let ScreenComponent;
    switch (activeScreen) {
      case 'newExpense':
        ScreenComponent = <NewExpenseScreen onBack={handleBack} />;
        break;
      case 'uploadStatement':
        ScreenComponent = <UploadStatementScreen onBack={handleBack} />;
        break;
      case 'needsAttention':
        ScreenComponent = <NeedsAttentionScreen onBack={handleBack} />;
        break;
      case 'statements':
        ScreenComponent = <StatementsScreen onBack={handleBack} onNavigate={(screen) => setActiveScreen(screen as any)} />;
        break;
      case 'recurring':
        ScreenComponent = <RecurringScreen onBack={handleBack} />;
        break;
      case 'salesReport':
        ScreenComponent = <SalesReportScreen onBack={handleBack} />;
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
              onPress={() => setShowBusinessDropdown(!showBusinessDropdown)}
            >
              <Text style={styles.businessName}>{businessName}</Text>
              <Ionicons 
                name={showBusinessDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
            
            {/* Business Dropdown Menu */}
            {showBusinessDropdown && (
              <View style={styles.businessDropdown}>
                {businesses.map((business, index) => (
                  <TouchableOpacity
                    key={business.id}
                    style={[
                      styles.businessDropdownItem,
                      selectedBusiness === business.name && styles.businessDropdownItemActive
                    ]}
                    onPress={() => {
                      setSelectedBusiness(business.name);
                      setShowBusinessDropdown(false);
                    }}
                  >
                    <View style={styles.businessDropdownItemContent}>
                      <Text style={[
                        styles.businessDropdownText,
                        selectedBusiness === business.name && styles.businessDropdownTextActive
                      ]}>
                        {business.name}
                      </Text>
                    </View>
                    {selectedBusiness === business.name && (
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
          <Text style={styles.overviewValue}>${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.overviewPeriod}>January 2026</Text>
          
          <View style={styles.overviewStatsGrid}>
            <View style={styles.overviewStatLeft}>
              <Text style={styles.overviewStatLabel}>{t('home.netProfit')}</Text>
              <Text style={styles.overviewStatValueLarge}>${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStatRight}>
              <View style={styles.overviewStatRightItem}>
                <Text style={styles.overviewStatLabel}>{t('home.grossSales')}</Text>
                <Text style={styles.overviewStatValue}>${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.overviewStatRightItem}>
                <Text style={styles.overviewStatLabel}>{t('home.expenses')}</Text>
                <Text style={styles.overviewStatValue}>${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>
        </View>

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
            <Ionicons name="document-text" size={22} color={colors.textSecondary} />
            <Text style={styles.trackingTitle}>{t('home.receiptTracking')}</Text>
          </View>
          
          <View style={styles.trackingRow}>
            <View style={styles.trackingStat}>
              <Text style={styles.trackingValue}>{capturedReceipts}/{totalTransactions}</Text>
              <Text style={styles.trackingLabel}>{t('home.matched')}</Text>
            </View>
            <View style={styles.trackingDivider} />
            <View style={styles.trackingStat}>
              <Text style={[styles.trackingValue, unmatchedItems > 0 && styles.trackingValueWarning]}>{unmatchedItems}</Text>
              <Text style={styles.trackingLabel}>{t('home.unmatchedLabel')}</Text>
            </View>
          </View>
        </View>

        {/* Needs Attention - Only show when there are issues */}
        {alerts.length > 0 && (
          <TouchableOpacity style={styles.needsAttentionBox} onPress={() => setActiveScreen('needsAttention')}>
            <View style={styles.needsAttentionLeft}>
              <View style={styles.needsAttentionIcon}>
                <Ionicons name="alert-circle" size={24} color={colors.red} />
              </View>
              <View style={styles.needsAttentionContent}>
                <Text style={styles.needsAttentionTitle}>{t('home.needsAttention')}</Text>
                <Text style={styles.needsAttentionSubtitle}>{alerts.length} items require action</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('statements')}>
            <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>{t('home.statements')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('recurring')}>
            <Ionicons name="repeat-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>{t('home.recurring')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setActiveScreen('salesReport')}>
            <Ionicons name="stats-chart-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>{t('salesReport.title')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    {renderOverlayScreen()}
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
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
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
    fontSize: 20,
    fontWeight: '800',
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
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
});
