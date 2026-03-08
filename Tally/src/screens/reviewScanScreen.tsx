import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';
import { CATEGORIES, getCategoryColor } from '../components/categories';
import { extractReceiptData } from '../services/aiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrgCachedData } from '../services/cacheService';
import { getAccessToken } from '../services/authService';
// @ts-ignore — legacy subpath has no type declarations but works at runtime
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

const PAYMENT_METHOD_MAP: Record<string, string> = {
  'Credit Card': 'CREDIT_CARD',
  'Debit Card': 'DEBIT_CARD',
  'Cash': 'CASH',
};

interface ReviewScanScreenProps {
  imageUri: string;
  onBack: () => void;
  isSaving?: boolean;
  onSave?: (data: {
    merchant: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: Date;
    notes: string;
    imageUri: string;
    documentType?: 'receipt' | 'sales_report';
  }) => void;
  selectedOrgId?: string | null;
  onSuccess?: () => void;
  defaultDocumentType?: 'receipt' | 'sales_report';
}

export default function ReviewScanScreen({ imageUri, onBack, onSave, isSaving: _isSaving = false, selectedOrgId, onSuccess, defaultDocumentType }: ReviewScanScreenProps) {
  const { t } = useContext(LanguageContext);
  const [isExtracting, setIsExtracting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Debit Card' | 'Cash'>('Credit Card');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [documentType, setDocumentType] = useState<'receipt' | 'sales_report'>(defaultDocumentType || 'receipt');
  const [showDocumentTypePicker, setShowDocumentTypePicker] = useState(false);
  // Sales report fields
  const [grossSales, setGrossSales] = useState('');
  const [netSales, setNetSales] = useState('');
  const [cash, setCash] = useState('');
  const [tips, setTips] = useState('');
  const [tax, setTax] = useState('');
  const [discounts, setDiscounts] = useState('');
  const [refunds, setRefunds] = useState('');


  useEffect(() => {
    extractData();
  }, []);

  const extractData = async () => {
    try {
      setIsExtracting(true);

      // Load org categories to pass to AI
      let allCategories: string[] = [...CATEGORIES];
      try {
        const userStr = await AsyncStorage.getItem('@current_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const orgId = user.organizations?.[0]?.id;
          if (orgId) {
            const orgData = await getOrgCachedData(orgId);
            const orgCategories = orgData?.categories;
            if (orgCategories && Array.isArray(orgCategories)) {
              const orgCategoryNames = orgCategories.map((c: any) => c.preset?.name || c.name || c.categoryName).filter(Boolean);
              allCategories = [...allCategories, ...orgCategoryNames];
            }
          }
        }
      } catch (err) {
        // silently fail - continue with preset categories
        // Continue with just preset categories
      }

      const extracted = await extractReceiptData(imageUri, allCategories);

      if (extracted.merchant) setMerchant(extracted.merchant);
      if (extracted.amount) setAmount(extracted.amount);
      if (extracted.category) setSelectedCategory(extracted.category);
      if (extracted.date) setSelectedDate(extracted.date);
      if (extracted.notes) setNotes(extracted.notes);
      if (extracted.documentType) setDocumentType(extracted.documentType);
      // Sales report fields
      if (extracted.grossSales) setGrossSales(extracted.grossSales);
      if (extracted.netSales) setNetSales(extracted.netSales);
      if (extracted.cash) setCash(extracted.cash);
      if (extracted.tips) setTips(extracted.tips);
      if (extracted.tax) setTax(extracted.tax);
      if (extracted.discounts) setDiscounts(extracted.discounts);
      if (extracted.refunds) setRefunds(extracted.refunds);
    } catch (error) {
      // Alert is shown below
      Alert.alert(
        t('reviewScan.extractionError'),
        t('reviewScan.extractionErrorMessage'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const toCents = (val: string): string => String(Math.round(parseFloat(val || '0') * 100));

  const handleSave = async () => {
    // Validate required fields based on document type
    if (documentType === 'sales_report') {
      if (!grossSales.trim() && !netSales.trim()) {
        Alert.alert(t('common.validationError'), t('reviewScan.enterGrossOrNetSales'));
        return;
      }
    } else {
      if (!merchant.trim()) {
        Alert.alert(t('common.validationError'), t('reviewScan.enterMerchant'));
        return;
      }
      if (!amount.trim()) {
        Alert.alert(t('common.validationError'), t('reviewScan.enterAmount'));
        return;
      }
      if (!selectedCategory) {
        Alert.alert(t('common.validationError'), t('reviewScan.selectCategory'));
        return;
      }
    }

    setIsSaving(true);
    try {
      // Get auth token and org ID
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setIsSaving(false);
        return;
      }

      let orgId = selectedOrgId;
      if (!orgId) {
        const userRaw = await AsyncStorage.getItem('@current_user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        orgId = user?.organizations?.[0]?.id;
      }

      if (!orgId) {
        Alert.alert('Error', 'No organization found. Please log in again.');
        setIsSaving(false);
        return;
      }

      // Prepare upload parameters
      const paymentMethodApi = PAYMENT_METHOD_MAP[paymentMethod] || 'CREDIT_CARD';

      // Prepare file URI with file:// prefix for iOS
      let fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;
      const filename = fileUri.split('/').pop() || 'scan.jpg';
      const cachedUri = `${FileSystem.cacheDirectory}${filename}`;

      // Copy to cache with timeout (copyAsync can hang on invalid URIs)
      const copyWithTimeout = Promise.race([
        FileSystem.copyAsync({ from: fileUri, to: cachedUri }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('File copy timed out. Please scan again.')), 15000)
        ),
      ]);
      await copyWithTimeout;
      fileUri = cachedUri;

      // Build endpoint and form fields
      let endpoint: string;
      const parameters: Record<string, string> = {};

      if (documentType === 'sales_report') {
        endpoint = `${API_URL}/api/sales-reports/with-receipt`;
        parameters.businessDate = selectedDate.toISOString();
        if (merchant.trim()) parameters.merchant = merchant.trim();
        if (notes.trim()) parameters.notes = notes.trim();
        if (grossSales.trim()) parameters.grossSalesCents = toCents(grossSales);
        if (netSales.trim()) parameters.netSalesCents = toCents(netSales);
        if (cash.trim()) parameters.cashCents = toCents(cash);
        if (tips.trim()) parameters.tipsCents = toCents(tips);
        if (tax.trim()) parameters.taxCents = toCents(tax);
        if (discounts.trim()) parameters.discountsCents = toCents(discounts);
        if (refunds.trim()) parameters.refundsCents = toCents(refunds);
      } else {
        const amountCents = Math.round(parseFloat(amount) * 100);
        parameters.amountCents = String(amountCents);
        endpoint = `${API_URL}/api/expenses/with-receipt`;
        parameters.paymentMethod = paymentMethodApi;
        parameters.expenseDate = selectedDate.toISOString();
        parameters.categoryName = selectedCategory!;
        if (merchant.trim()) parameters.merchant = merchant.trim();
        if (notes.trim()) parameters.notes = notes.trim();
      }

      // Upload with timeout
      const uploadResult = await Promise.race([
        FileSystem.uploadAsync(endpoint, fileUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          parameters,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-org-id': orgId,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timed out. Please check your connection and try again.')), 90000)
        ),
      ]);

      const responseData = JSON.parse(uploadResult.body);
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(responseData.error || `Failed to save ${documentType === 'sales_report' ? 'sales report' : 'expense'}`);
      }

      // Update local cache based on document type
      const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

      if (documentType === 'sales_report') {
        const savedReport = responseData.report;
        if (savedReport) {
          const cacheKey = `@org_sales_reports_${orgId}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          const cachedList = cached ? JSON.parse(cached) : [];
          const updatedList = [savedReport, ...cachedList];
          await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedList));

          // Clear monthly cache to force refresh on salesReportScreen
          await AsyncStorage.removeItem(`${cacheKey}_${monthKey}`);

          // Update home metrics cache with new sales figures
          try {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (monthKey === currentMonthKey) {
              const metricsRaw = await AsyncStorage.getItem('@home_metrics');
              const metricsData = metricsRaw ? JSON.parse(metricsRaw) : {};
              if (!metricsData.byOrg) metricsData.byOrg = {};
              if (!metricsData.byOrg[orgId]) metricsData.byOrg[orgId] = {};
              const orgMetrics = metricsData.byOrg[orgId];
              orgMetrics.grossSales = (orgMetrics.grossSales || 0) + (savedReport.grossSalesCents ? savedReport.grossSalesCents / 100 : 0);
              orgMetrics.netSales = (orgMetrics.netSales || 0) + (savedReport.netSalesCents ? savedReport.netSalesCents / 100 : 0);
              await AsyncStorage.setItem('@home_metrics', JSON.stringify(metricsData));
            }
          } catch { }
        }
      } else {
        const savedExpense = responseData.expense;
        if (savedExpense) {
          const cacheKey = `@org_expenses_${orgId}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          const cachedList = cached ? JSON.parse(cached) : [];
          const updatedList = [savedExpense, ...cachedList];
          await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedList));

          // Clear monthly cache to force refresh on expensesScreen
          await AsyncStorage.removeItem(`${cacheKey}_${monthKey}`);

          // Update home metrics cache with new expense figures
          try {
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            if (monthKey === currentMonthKey) {
              const metricsRaw = await AsyncStorage.getItem('@home_metrics');
              const metricsData = metricsRaw ? JSON.parse(metricsRaw) : {};
              if (!metricsData.byOrg) metricsData.byOrg = {};
              if (!metricsData.byOrg[orgId]) metricsData.byOrg[orgId] = {};
              const orgMetrics = metricsData.byOrg[orgId];
              const expenseAmount = savedExpense.amountCents ? savedExpense.amountCents / 100 : (parseFloat(amount) || 0);
              orgMetrics.totalSpent = (orgMetrics.totalSpent || 0) + expenseAmount;
              orgMetrics.capturedReceipts = (orgMetrics.capturedReceipts || 0) + 1;
              orgMetrics.totalTransactions = (orgMetrics.totalTransactions || 0) + 1;
              await AsyncStorage.setItem('@home_metrics', JSON.stringify(metricsData));
            }
          } catch { }
        }
      }

      // Call optional legacy onSave callback for compatibility
      if (onSave) {
        onSave({
          merchant,
          amount,
          category: selectedCategory!,
          paymentMethod,
          date: selectedDate,
          notes,
          imageUri,
          documentType,
        });
      }

      // Show success and call onSuccess
      Alert.alert(
        'Success',
        `${documentType === 'sales_report' ? 'Sales report' : 'Expense'} saved successfully!`,
        [{ text: 'OK', onPress: () => onSuccess?.() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to save. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to discard this scan?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: onBack, style: 'destructive' }
      ]
    );
  };

  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Pressable
        style={styles.container}
        onPress={() => {
          if (showCategoryPicker) setShowCategoryPicker(false);
          if (showPaymentPicker) setShowPaymentPicker(false);
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Scan</Text>
          <View style={styles.placeholder} />
        </View>

        {isExtracting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Extracting data...</Text>
            <Text style={styles.loadingSubtext}>Please wait while AI reads your document</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Merchant Input — receipts only */}
            {documentType === 'receipt' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('reviewScan.merchant')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter merchant name"
                  placeholderTextColor={colors.textSecondary}
                  value={merchant}
                  onChangeText={setMerchant}
                />
              </View>
            )}

            {/* Document Type Picker — shown early so user can switch */}
            <View style={[styles.inputGroup, showDocumentTypePicker && styles.inputGroupActive]}>
              <Text style={styles.label}>{t('reviewScan.documentType')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDocumentTypePicker(!showDocumentTypePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Ionicons
                    name={documentType === 'sales_report' ? 'trending-up-outline' : 'receipt-outline'}
                    size={20}
                    color={colors.textPrimary}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={styles.pickerButtonText}>
                    {documentType === 'receipt' ? 'Receipt (Expense)' : 'Sales Report (Income)'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {showDocumentTypePicker && (
                <Pressable
                  style={styles.pickerDropdown}
                  onPress={(e) => e.stopPropagation()}
                >
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      documentType === 'receipt' && styles.pickerItemSelected
                    ]}
                    onPress={() => {
                      setDocumentType('receipt');
                      setShowDocumentTypePicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Ionicons name="receipt-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                      <Text style={[
                        styles.pickerItemText,
                        documentType === 'receipt' && styles.pickerItemTextSelected
                      ]}>Receipt (Expense)</Text>
                    </View>
                    {documentType === 'receipt' && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      documentType === 'sales_report' && styles.pickerItemSelected
                    ]}
                    onPress={() => {
                      setDocumentType('sales_report');
                      setShowDocumentTypePicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Ionicons name="trending-up-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                      <Text style={[
                        styles.pickerItemText,
                        documentType === 'sales_report' && styles.pickerItemTextSelected
                      ]}>Sales Report (Income)</Text>
                    </View>
                    {documentType === 'sales_report' && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </Pressable>
              )}
            </View>

            {/* Receipt-only fields */}
            {documentType === 'receipt' && (
              <>
                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.amount')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Category Picker */}
                <View style={[styles.inputGroup, showCategoryPicker && styles.inputGroupActive]}>
                  <Text style={styles.label}>{t('reviewScan.category')}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <View style={styles.pickerButtonContent}>
                      {selectedCategory && (
                        <View style={[
                          styles.categoryColorDot,
                          { backgroundColor: getCategoryColor(selectedCategory) }
                        ]} />
                      )}
                      <Text style={[
                        styles.pickerButtonText,
                        !selectedCategory && styles.pickerPlaceholder
                      ]}>
                        {selectedCategory || t('newExpense.selectCategory')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <Pressable
                      style={styles.pickerDropdown}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <ScrollView style={styles.pickerDropdownScroll} nestedScrollEnabled>
                        {CATEGORIES.map((category) => (
                          <TouchableOpacity
                            key={category}
                            style={[
                              styles.pickerItem,
                              selectedCategory === category && styles.pickerItemSelected
                            ]}
                            onPress={() => {
                              setSelectedCategory(category);
                              setShowCategoryPicker(false);
                            }}
                          >
                            <View style={styles.pickerItemContent}>
                              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(category) }]} />
                              <Text style={[
                                styles.pickerItemText,
                                selectedCategory === category && styles.pickerItemTextSelected
                              ]}>{category}</Text>
                            </View>
                            {selectedCategory === category && (
                              <Ionicons name="checkmark" size={18} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Pressable>
                  )}
                </View>

                {/* Payment Method Picker */}
                <View style={[styles.inputGroup, showPaymentPicker && styles.inputGroupActive]}>
                  <Text style={styles.label}>{t('newExpense.paymentMethod')}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowPaymentPicker(!showPaymentPicker)}
                  >
                    <View style={styles.pickerButtonContent}>
                      <Ionicons
                        name={paymentMethod === 'Cash' ? 'cash-outline' : 'card-outline'}
                        size={20}
                        color={colors.textPrimary}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={styles.pickerButtonText}>
                        {t(`newExpense.${paymentMethod === 'Credit Card' ? 'creditCard' : paymentMethod === 'Debit Card' ? 'debitCard' : 'cash'}`)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {showPaymentPicker && (
                    <Pressable
                      style={styles.pickerDropdown}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          paymentMethod === 'Credit Card' && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setPaymentMethod('Credit Card');
                          setShowPaymentPicker(false);
                        }}
                      >
                        <View style={styles.pickerItemContent}>
                          <Ionicons name="card-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                          <Text style={[
                            styles.pickerItemText,
                            paymentMethod === 'Credit Card' && styles.pickerItemTextSelected
                          ]}>{t('newExpense.creditCard')}</Text>
                        </View>
                        {paymentMethod === 'Credit Card' && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          paymentMethod === 'Debit Card' && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setPaymentMethod('Debit Card');
                          setShowPaymentPicker(false);
                        }}
                      >
                        <View style={styles.pickerItemContent}>
                          <Ionicons name="card-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                          <Text style={[
                            styles.pickerItemText,
                            paymentMethod === 'Debit Card' && styles.pickerItemTextSelected
                          ]}>{t('newExpense.debitCard')}</Text>
                        </View>
                        {paymentMethod === 'Debit Card' && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          paymentMethod === 'Cash' && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setPaymentMethod('Cash');
                          setShowPaymentPicker(false);
                        }}
                      >
                        <View style={styles.pickerItemContent}>
                          <Ionicons name="cash-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                          <Text style={[
                            styles.pickerItemText,
                            paymentMethod === 'Cash' && styles.pickerItemTextSelected
                          ]}>{t('newExpense.cash')}</Text>
                        </View>
                        {paymentMethod === 'Cash' && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {/* Sales Report fields */}
            {documentType === 'sales_report' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.grossSales')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={grossSales}
                      onChangeText={setGrossSales}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.netSales')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={netSales}
                      onChangeText={setNetSales}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.cash')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={cash}
                      onChangeText={setCash}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.tips')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={tips}
                      onChangeText={setTips}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.tax')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={tax}
                      onChangeText={setTax}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.discounts')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={discounts}
                      onChangeText={setDiscounts}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('reviewScan.refunds')}</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={refunds}
                      onChangeText={setRefunds}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {documentType === 'sales_report' ? t('reviewScan.businessDate') : t('reviewScan.date')}
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerButtonText}>{formatDate(selectedDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Notes Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('reviewScan.notes')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Add any additional notes"
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Scanned Document Image */}
            <View style={styles.receiptSection}>
              <Text style={styles.receiptSectionTitle}>Scanned Document</Text>
              <Image
                source={{ uri: imageUri }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </View>

          </ScrollView>
        )}

        {!isExtracting && (
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, isSaving && styles.cancelButtonDisabled]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          selectedDate={selectedDate}
          onDateChange={(date) => setSelectedDate(date)}
          onClose={() => setShowDatePicker(false)}
        />
      </Pressable>
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
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: '50%',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.xl,
    position: 'relative',
    zIndex: 1,
  },
  inputGroupActive: {
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    color: colors.textSecondary,
  },
  pickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  pickerDropdownScroll: {
    maxHeight: 300,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerItemSelected: {
    backgroundColor: colors.background,
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerItemText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  receiptSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  receiptSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});
