import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import DatePickerModal, { DateRange } from '../../components/DatePickerModal';
import { getAccessToken } from '../../services/authService';
import { LanguageContext } from '../../contexts/LanguageContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface AccountingReportScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

const reportOptions = [
  {
    key: 'profitLoss',
    titleKey: 'accountingReports.profitLoss',
    descriptionKey: 'accountingReports.profitLossDescription',
    icon: 'trending-up-outline' as const,
    color: '#2563EB',
    disabled: true,
  },
  {
    key: 'scheduleC',
    titleKey: 'accountingReports.scheduleC',
    descriptionKey: 'accountingReports.scheduleCDescription',
    icon: 'document-text-outline' as const,
    color: '#7C3AED',
    disabled: true,
  },
  {
    key: 'expenseLedger',
    titleKey: 'accountingReports.expenseLedger',
    descriptionKey: 'accountingReports.expenseLedgerDescription',
    icon: 'receipt-outline' as const,
    color: '#059669',
    disabled: true,
  },
  {
    key: 'receiptImages',
    titleKey: 'accountingReports.receiptImages',
    descriptionKey: 'accountingReports.receiptImagesDescription',
    icon: 'images-outline' as const,
    color: '#D97706',
    disabled: true,
  },
];

const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDefaultEndDate = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

export default function AccountingReportScreen({ onBack, selectedOrgId }: AccountingReportScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedReports, setSelectedReports] = useState<Record<string, boolean>>({
    profitLoss: false,
    scheduleC: false,
    expenseLedger: false,
    receiptImages: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<DateRange>({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    mode: 'range',
  });
  const swipeHandlers = useSwipeBack(onBack);

  const selectedCount = Object.values(selectedReports).filter(Boolean).length;
  const isReceiptExportSelected = Boolean(selectedReports.receiptImages);

  const toggleReport = (key: string) => {
    if (reportOptions.find(option => option.key === key)?.disabled) return;
    setSelectedReports(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDateRangeChange = (range: DateRange) => {
    const startDate = new Date(range.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(range.endDate);
    endDate.setHours(23, 59, 59, 999);
    setExportDateRange({ startDate, endDate, mode: 'range' });
  };

  const handleSingleDateChange = (date: Date) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    setExportDateRange({ startDate, endDate, mode: 'single' });
  };

  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please log in again.');
    }

    return {
      Authorization: `Bearer ${token}`,
      ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
    };
  };

  const exportReceiptImages = async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({
      startDate: exportDateRange.startDate.toISOString(),
      endDate: exportDateRange.endDate.toISOString(),
    });
    const res = await fetch(`${API_URL}/api/expenses/export/receipt-images?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || t('accountingReports.exportFailed'));
    }
    if (!data.csvBase64) {
      throw new Error(t('accountingReports.noExportReturned'));
    }

    const fileUri = `${FileSystem.cacheDirectory}${data.fileName || `receipt-images-${Date.now()}.csv`}`;
    await FileSystem.writeAsStringAsync(fileUri, data.csvBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Share.share({
      title: t('accountingReports.receiptImagesExport'),
      url: fileUri,
    });

    return data.count || 0;
  };

  const handleGenerate = async () => {
    if (selectedCount === 0) {
      Alert.alert(t('accountingReports.noReportsSelected'), t('accountingReports.chooseAccountingReport'));
      return;
    }

    setIsGenerating(true);
    try {
      if (isReceiptExportSelected) {
        const count = await exportReceiptImages();
        Alert.alert(t('accountingReports.receiptExportReady'), `${t('accountingReports.exported')} ${count} ${t('accountingReports.receiptRecords')}`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1200));
      Alert.alert(t('accountingReports.reportReady'), t('accountingReports.reportQueued'), [
        { text: t('common.ok'), onPress: onBack },
      ]);
    } catch (error: any) {
      Alert.alert(t('accountingReports.exportError'), error.message || t('accountingReports.exportFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('accountingReports.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>{t('accountingReports.infoText')}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>{t('accountingReports.dateRange')}</Text>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setIsDatePickerVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={18} color="#16A34A" />
                <View style={styles.dateRangeText}>
                  <Text style={styles.dateRangeValue}>
                    {formatDate(exportDateRange.startDate)} - {formatDate(exportDateRange.endDate)}
                  </Text>
                  <Text style={styles.dateRangeHint}>{t('accountingReports.dateRangeHint')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {reportOptions.map(option => {
              const isSelected = selectedReports[option.key];
              const isDisabled = option.disabled;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.reportItem, (!isSelected || isDisabled) && styles.reportItemInactive]}
                  onPress={() => toggleReport(option.key)}
                  disabled={isDisabled}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon} size={22} color={isSelected && !isDisabled ? option.color : colors.textTertiary} />
                  </View>
                  <View style={styles.reportText}>
                    <Text style={[styles.reportTitle, !isSelected && styles.reportTitleInactive]}>{t(option.titleKey)}</Text>
                    <Text style={styles.reportDescription}>
                      {isDisabled ? `${t(option.descriptionKey)} ${t('accountingReports.comingLater')}` : t(option.descriptionKey)}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.surface} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateButton, (isGenerating || selectedCount === 0) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating || selectedCount === 0}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.generateButtonText}>
                {t('accountingReports.comingSoonButton')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <DatePickerModal
        visible={isDatePickerVisible}
        selectedDate={exportDateRange.startDate}
        onDateChange={handleSingleDateChange}
        onDateRangeChange={handleDateRangeChange}
        onClose={() => setIsDatePickerVisible(false)}
      />
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    marginTop: 2,
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
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  controlGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRangeButton: {
    minHeight: 54,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateRangeText: {
    paddingLeft: 11,
    flex: 1,
    gap: 2,
  },
  dateRangeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateRangeHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  reportItemInactive: {
    opacity: 0.65,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    flex: 1,
    gap: 3,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reportTitleInactive: {
    color: colors.textTertiary,
  },
  reportDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.55,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
