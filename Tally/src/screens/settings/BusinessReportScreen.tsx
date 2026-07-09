import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import DatePickerModal, { DateRange } from '../../components/DatePickerModal';
import { getAccessToken } from '../../services/authService';
import { CACHE_KEYS, getCachedData } from '../../services/cacheService';
import { LanguageContext } from '../../contexts/LanguageContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface BusinessReportScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

const reportOptions = [
  {
    key: 'inventory',
    titleKey: 'businessReports.inventory',
    descriptionKey: 'businessReports.inventoryDescription',
    icon: 'cube-outline',
    color: '#059669',
  },
  {
    key: 'expenses',
    titleKey: 'businessReports.expenses',
    descriptionKey: 'businessReports.expensesDescription',
    icon: 'receipt-outline',
    color: '#2563EB',
  },
  {
    key: 'wages',
    titleKey: 'businessReports.wages',
    descriptionKey: 'businessReports.wagesDescription',
    icon: 'people-outline',
    color: '#9333EA',
  },
  {
    key: 'sales',
    titleKey: 'businessReports.sales',
    descriptionKey: 'businessReports.salesDescription',
    icon: 'bar-chart-outline',
    color: '#D97706',
  },
];

const getDefaultReportSelection = () =>
  reportOptions.reduce<Record<string, boolean>>((selection, option) => {
    selection[option.key] = true;
    return selection;
  }, {});

const getDefaultAutomationReportSelection = () =>
  reportOptions.reduce<Record<string, boolean>>((selection, option) => {
    selection[option.key] = ['inventory', 'wages', 'sales'].includes(option.key);
    return selection;
  }, {});

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

type BusinessReportAutomation = {
  reports?: string[];
  deliveryChannels?: string[];
  messageRecipient?: string | null;
  emailRecipient?: string | null;
  cadence?: string;
  isActive?: boolean;
};

const normalizeReportKeyForUi = (key: string) => {
  if (key === 'labor') return 'wages';
  if (key === 'supplies') return 'inventory';
  return key;
};

const normalizeReportKeyForApi = (key: string) => {
  if (key === 'wages') return 'labor';
  return key;
};

const getSelectionState = (selectedKeys: string[] = [], fallback: Record<string, boolean>) => {
  const validKeys = new Set(reportOptions.map(option => option.key));
  const normalized = selectedKeys.map(normalizeReportKeyForUi).filter(key => validKeys.has(key));
  if (normalized.length === 0) return fallback;

  return reportOptions.reduce<Record<string, boolean>>((selection, option) => {
    selection[option.key] = normalized.includes(option.key);
    return selection;
  }, {});
};

const getDeliveryState = (selectedKeys: string[] = [], fallback: Record<'message' | 'email', boolean>) => {
  const normalized = selectedKeys.filter((key): key is 'message' | 'email' => key === 'message' || key === 'email');
  if (normalized.length === 0) return fallback;

  return {
    message: normalized.includes('message'),
    email: normalized.includes('email'),
  };
};

export default function BusinessReportScreen({ onBack, selectedOrgId }: BusinessReportScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedReports, setSelectedReports] = useState<Record<string, boolean>>(getDefaultReportSelection);
  const [automationReports, setAutomationReports] = useState<Record<string, boolean>>(getDefaultAutomationReportSelection);
  const [deliveryChannels, setDeliveryChannels] = useState<Record<'message' | 'email', boolean>>({
    message: false,
    email: false,
  });
  const [messageRecipient, setMessageRecipient] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [deliveryCadence, setDeliveryCadence] = useState<'weekly' | 'monthly' | null>(null);
  const [hasSavedAutomation, setHasSavedAutomation] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [isRemovingAutomation, setIsRemovingAutomation] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<DateRange>({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    mode: 'range',
  });
  const swipeHandlers = useSwipeBack(onBack);

  const selectedCount = Object.values(selectedReports).filter(Boolean).length;
  const automationCount = Object.values(automationReports).filter(Boolean).length;
  const deliveryCount = Object.values(deliveryChannels).filter(Boolean).length;

  const getAutomationCacheKey = async () => {
    const user = await getCachedData(CACHE_KEYS.USER);
    const userId = user?.id || 'current';
    const orgId = selectedOrgId || user?.organizations?.[0]?.id || 'current';
    return `${CACHE_KEYS.ORG_BUSINESS_REPORT_AUTOMATION}${orgId}_${userId}`;
  };

  const applyAutomationSettings = (automation?: BusinessReportAutomation | null) => {
    if (!automation) return;
    if (automation.isActive === false) {
      resetAutomationSettings();
      return;
    }

    setHasSavedAutomation(true);
    setAutomationReports(prev => getSelectionState(automation.reports || [], prev));
    setDeliveryChannels(prev => getDeliveryState(automation.deliveryChannels || [], prev));
    setMessageRecipient(automation.messageRecipient || '');
    setEmailRecipient(automation.emailRecipient || '');
    if (automation.cadence === 'weekly' || automation.cadence === 'monthly') {
      setDeliveryCadence(automation.cadence);
    }
  };

  const cacheAutomationSettings = async (automation: BusinessReportAutomation) => {
    const cacheKey = await getAutomationCacheKey();
    await AsyncStorage.setItem(cacheKey, JSON.stringify(automation));
  };

  const resetAutomationSettings = async () => {
    setHasSavedAutomation(false);
    setAutomationReports(getDefaultAutomationReportSelection());
    setDeliveryChannels({ message: false, email: false });
    setMessageRecipient('');
    setEmailRecipient('');
    setDeliveryCadence(null);

    const cacheKey = await getAutomationCacheKey();
    await AsyncStorage.removeItem(cacheKey);
  };

  useEffect(() => {
    let isActive = true;

    const loadAutomationSettings = async () => {
      try {
        const cacheKey = await getAutomationCacheKey();
        const cachedAutomation = await getCachedData(cacheKey);
        if (isActive && cachedAutomation) {
          applyAutomationSettings(cachedAutomation);
        }

        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/business-reports/automation`, {
          method: 'GET',
          headers,
        });
        const data = await res.json();

        if (!isActive || !res.ok || !data.success) return;

        if (data.automation) {
          applyAutomationSettings(data.automation);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data.automation));
        }
      } catch (error) {
        // Cached defaults are enough if the automation fetch is unavailable.
      }
    };

    loadAutomationSettings();

    return () => {
      isActive = false;
    };
  }, [selectedOrgId]);

  const toggleReport = (key: string) => {
    setSelectedReports(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAutomationReport = (key: string) => {
    setAutomationReports(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDeliveryChannel = (key: 'message' | 'email') => {
    setDeliveryChannels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSelectedKeys = (selection: Record<string, boolean>) => {
    return Object.entries(selection)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);
  };

  const getSelectedApiReportKeys = (selection: Record<string, boolean>) => {
    return getSelectedKeys(selection).map(normalizeReportKeyForApi);
  };

  const getLegacyCompatibleReportKeys = (selection: Record<string, boolean>) => {
    return getSelectedApiReportKeys(selection).filter(key => key !== 'expenses');
  };

  const isLegacyReportValidationError = (message?: string) => {
    return typeof message === 'string' && message.includes('labor, inventory, sales');
  };

  const readJsonSafely = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const getSelectedDeliveryChannels = () => {
    return Object.entries(deliveryChannels)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);
  };

  const getAuthHeaders = async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please log in again.');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
    };
  };

  const previewPdf = async (pdfBase64: string, fileName: string) => {
    const fileUri = `${FileSystem.cacheDirectory}${fileName || `business-report-${Date.now()}.pdf`}`;
    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Share.share({
      title: 'Business Report',
      url: fileUri,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isRangeOverTwoMonths = (range: DateRange) => {
    const maxEndDate = new Date(range.startDate);
    maxEndDate.setMonth(maxEndDate.getMonth() + 2);
    maxEndDate.setHours(23, 59, 59, 999);
    return range.endDate.getTime() > maxEndDate.getTime();
  };

  const handleDateRangeChange = (range: DateRange) => {
    const startDate = new Date(range.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(range.endDate);
    endDate.setHours(23, 59, 59, 999);
    setReportDateRange({ startDate, endDate, mode: 'range' });
  };

  const handleSingleDateChange = (date: Date) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    setReportDateRange({ startDate, endDate, mode: 'single' });
  };

  const handleGenerate = async () => {
    if (selectedCount === 0) {
      Alert.alert(t('businessReports.noReportsSelected'), t('businessReports.chooseBusinessReport'));
      return;
    }
    if (isRangeOverTwoMonths(reportDateRange)) {
      Alert.alert(t('businessReports.dateRangeTooLong'), t('businessReports.maxRangeMessage'));
      return;
    }

    setIsGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const createPdf = async (reports: string[]) => {
        const res = await fetch(`${API_URL}/api/business-reports/create-pdf`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reports,
            startDate: reportDateRange.startDate.toISOString(),
            endDate: reportDateRange.endDate.toISOString(),
          }),
        });
        const data = await res.json();
        return { res, data };
      };

      let { res, data } = await createPdf(getSelectedApiReportKeys(selectedReports));

      if (!res.ok && selectedReports.expenses && isLegacyReportValidationError(data.error)) {
        const compatibleReports = getLegacyCompatibleReportKeys(selectedReports);
        if (compatibleReports.length > 0) {
          ({ res, data } = await createPdf(compatibleReports));
        }
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('businessReports.createFailed'));
      }

      if (!data.pdfBase64) {
        throw new Error(t('businessReports.noPdfReturned'));
      }

      await previewPdf(data.pdfBase64, data.fileName);
    } catch (error: any) {
      Alert.alert(t('businessReports.reportError'), error.message || t('businessReports.createFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAutomation = async () => {
    if (automationCount === 0) {
      Alert.alert(t('businessReports.noReportsSelected'), t('businessReports.chooseAutomationReport'));
      return;
    }
    if (deliveryCount === 0) {
      Alert.alert(t('businessReports.noDeliveryMethod'), t('businessReports.chooseDeliveryMethod'));
      return;
    }
    if (!deliveryCadence) {
      Alert.alert(t('businessReports.noFrequencySelected'), t('businessReports.chooseFrequency'));
      return;
    }
    if (deliveryChannels.message && !messageRecipient.trim()) {
      Alert.alert(t('businessReports.phoneRequired'), t('businessReports.enterPhone'));
      return;
    }
    if (deliveryChannels.email && !emailRecipient.trim()) {
      Alert.alert(t('businessReports.emailRequired'), t('businessReports.enterEmail'));
      return;
    }

    setIsSavingAutomation(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/business-reports/automation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reports: getSelectedApiReportKeys(automationReports),
          deliveryChannels: getSelectedDeliveryChannels(),
          messageRecipient: messageRecipient.trim() || null,
          emailRecipient: emailRecipient.trim() || null,
          cadence: deliveryCadence,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || t('businessReports.saveAutomationFailed'));
      }

      const savedAutomation = data.automation || {
        reports: getSelectedApiReportKeys(automationReports),
        deliveryChannels: getSelectedDeliveryChannels(),
        messageRecipient: messageRecipient.trim() || null,
        emailRecipient: emailRecipient.trim() || null,
        cadence: deliveryCadence,
      };
      setHasSavedAutomation(true);
      applyAutomationSettings(savedAutomation);
      await cacheAutomationSettings(savedAutomation);

      const channels = [
        deliveryChannels.message ? t('businessReports.message').toLowerCase() : null,
        deliveryChannels.email ? t('businessReports.email').toLowerCase() : null,
      ].filter(Boolean).join(` ${t('businessReports.and')} `);
      Alert.alert(
        t('businessReports.automationSaved'),
        `${deliveryCadence === 'weekly' ? t('businessReports.weekly') : t('businessReports.monthly')} ${channels} ${t('businessReports.deliveryScheduled')}`
      );
    } catch (error: any) {
      Alert.alert(t('businessReports.automationError'), error.message || t('businessReports.saveAutomationFailed'));
    } finally {
      setIsSavingAutomation(false);
    }
  };

  const handleRemoveAutomation = async () => {
    setIsRemovingAutomation(true);
    try {
      const headers = await getAuthHeaders();
      const attempts = [
        {
          method: 'DELETE',
          path: '/api/business-reports/automation',
        },
        {
          method: 'POST',
          path: '/api/business-reports/automation/remove',
        },
        {
          method: 'POST',
          path: '/api/business-reports/automation',
          body: {
            action: 'remove',
            removeAutomation: true,
            deleteAutomation: true,
            isActive: false,
          },
        },
      ];
      let lastError = '';

      for (const attempt of attempts) {
        const res = await fetch(`${API_URL}${attempt.path}`, {
          method: attempt.method,
          headers,
          ...(attempt.body ? { body: JSON.stringify(attempt.body) } : {}),
        });
        const data = await readJsonSafely(res);

        if (res.ok && data.success) {
          await resetAutomationSettings();
          Alert.alert(t('businessReports.automationRemoved'), t('businessReports.automationRemovedMessage'));
          return;
        }

        lastError = `${attempt.method} ${attempt.path}: ${res.status} ${data.error || t('businessReports.removeAutomationFailed')}`;
      }

      if (lastError.includes('Route not found')) {
        throw new Error(t('businessReports.removeAutomationRouteMissing'));
      }
      throw new Error(lastError || t('businessReports.removeAutomationFailed'));
    } catch (error: any) {
      Alert.alert(t('businessReports.automationError'), error.message || t('businessReports.removeAutomationFailed'));
    } finally {
      setIsRemovingAutomation(false);
    }
  };

  const confirmRemoveAutomation = () => {
    Alert.alert(
      t('businessReports.removeAutomation'),
      t('businessReports.removeAutomationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('businessReports.remove'), style: 'destructive', onPress: handleRemoveAutomation },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('businessReports.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <Ionicons name="analytics-outline" size={20} color="#16A34A" />
            <Text style={styles.infoText}>{t('businessReports.infoText')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('businessReports.createReports')}</Text>
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>{t('businessReports.dateRange')}</Text>
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setIsDatePickerVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={18} color="#16A34A" />
                <View style={styles.dateRangeText}>
                  <Text style={styles.dateRangeValue}>
                    {formatDate(reportDateRange.startDate)} - {formatDate(reportDateRange.endDate)}
                  </Text>
                  <Text style={styles.dateRangeHint}>{t('businessReports.maxRangeHint')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {reportOptions.map(option => {
              const isSelected = selectedReports[option.key];
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.reportItem, !isSelected && styles.reportItemInactive]}
                  onPress={() => toggleReport(option.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon as any} size={22} color={isSelected ? option.color : colors.textTertiary} />
                  </View>
                  <View style={styles.reportText}>
                    <Text style={[styles.reportTitle, !isSelected && styles.reportTitleInactive]}>{t(option.titleKey)}</Text>
                    <Text style={styles.reportDescription}>{t(option.descriptionKey)}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.surface} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.generateButton, (isGenerating || selectedCount === 0) && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating || selectedCount === 0}
              activeOpacity={0.85}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.generateButtonText}>{t('businessReports.createPdfReport')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('businessReports.automatedDelivery')}</Text>
            <Text style={styles.sectionDescription}>{t('businessReports.automatedDeliveryDescription')}</Text>

            {reportOptions.map(option => {
              const isSelected = automationReports[option.key];
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.automationItem, !isSelected && styles.reportItemInactive]}
                  onPress={() => toggleAutomationReport(option.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconContainerSmall, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon as any} size={18} color={isSelected ? option.color : colors.textTertiary} />
                  </View>
                  <Text style={[styles.automationTitle, !isSelected && styles.reportTitleInactive]}>{t(option.titleKey)}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.surface} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>{t('businessReports.sendBy')}</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentPill, deliveryChannels.message && styles.segmentPillActive]}
                  onPress={() => toggleDeliveryChannel('message')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={deliveryChannels.message ? colors.surface : colors.textTertiary}
                  />
                  <Text style={[styles.segmentText, deliveryChannels.message && styles.segmentTextActive]}>{t('businessReports.message')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentPill, deliveryChannels.email && styles.segmentPillActive]}
                  onPress={() => toggleDeliveryChannel('email')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={deliveryChannels.email ? colors.surface : colors.textTertiary}
                  />
                  <Text style={[styles.segmentText, deliveryChannels.email && styles.segmentTextActive]}>{t('businessReports.email')}</Text>
                </TouchableOpacity>
              </View>
              {deliveryChannels.message && (
                <TextInput
                  style={styles.recipientInput}
                  value={messageRecipient}
                  onChangeText={setMessageRecipient}
                  placeholder={t('businessReports.phoneNumber')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              )}
              {deliveryChannels.email && (
                <TextInput
                  style={styles.recipientInput}
                  value={emailRecipient}
                  onChangeText={setEmailRecipient}
                  placeholder={t('businessReports.emailAddress')}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            </View>

            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>{t('businessReports.frequency')}</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentPill, deliveryCadence === 'weekly' && styles.segmentPillActive]}
                  onPress={() => setDeliveryCadence('weekly')}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, deliveryCadence === 'weekly' && styles.segmentTextActive]}>{t('businessReports.weekly')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentPill, deliveryCadence === 'monthly' && styles.segmentPillActive]}
                  onPress={() => setDeliveryCadence('monthly')}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, deliveryCadence === 'monthly' && styles.segmentTextActive]}>{t('businessReports.monthly')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.automationButton, (isSavingAutomation || isRemovingAutomation || automationCount === 0 || deliveryCount === 0 || !deliveryCadence) && styles.generateButtonDisabled]}
              onPress={handleSaveAutomation}
              disabled={isSavingAutomation || isRemovingAutomation || automationCount === 0 || deliveryCount === 0 || !deliveryCadence}
              activeOpacity={0.85}
            >
              {isSavingAutomation ? (
                <ActivityIndicator color="#16A34A" size="small" />
              ) : (
                <Text style={styles.automationButtonText}>{t('businessReports.saveAutomation')}</Text>
              )}
            </TouchableOpacity>

            {hasSavedAutomation && (
              <TouchableOpacity
                style={[styles.removeAutomationButton, isRemovingAutomation && styles.generateButtonDisabled]}
                onPress={confirmRemoveAutomation}
                disabled={isRemovingAutomation || isSavingAutomation}
                activeOpacity={0.85}
              >
                {isRemovingAutomation ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <Text style={styles.removeAutomationButtonText}>{t('businessReports.removeAutomation')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <DatePickerModal
          visible={isDatePickerVisible}
          selectedDate={reportDateRange.startDate}
          onDateChange={handleSingleDateChange}
          onDateRangeChange={handleDateRangeChange}
          onClose={() => setIsDatePickerVisible(false)}
          maxRangeMonths={2}
        />
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
    backgroundColor: '#DCFCE7',
    padding: spacing.lg,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#16A34A',
    lineHeight: 18,
  },
  section: {
    marginHorizontal: spacing.xxl,
    gap: spacing.sm,
    marginBottom: 50,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
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
  iconContainerSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  automationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  automationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
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
  segmentedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  segmentPillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  recipientInput: {
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  automationButton: {
    minHeight: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  automationButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
  removeAutomationButton: {
    minHeight: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAutomationButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  generateButton: {
    backgroundColor: '#16A34A',
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
