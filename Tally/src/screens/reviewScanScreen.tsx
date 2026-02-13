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

interface ReviewScanScreenProps {
  imageUri: string;
  onBack: () => void;
  onSave: (data: {
    merchant: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: Date;
    notes: string;
    imageUri: string;
  }) => void;
}

export default function ReviewScanScreen({ imageUri, onBack, onSave }: ReviewScanScreenProps) {
  const { t } = useContext(LanguageContext);
  const [isExtracting, setIsExtracting] = useState(true);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Debit Card' | 'Cash'>('Credit Card');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    extractData();
  }, []);

  const extractData = async () => {
    try {
      setIsExtracting(true);
      const extracted = await extractReceiptData(imageUri);
      
      if (extracted.merchant) setMerchant(extracted.merchant);
      if (extracted.amount) setAmount(extracted.amount);
      if (extracted.category) setSelectedCategory(extracted.category);
      if (extracted.date) setSelectedDate(extracted.date);
      if (extracted.notes) setNotes(extracted.notes);
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      Alert.alert(
        t('reviewScan.extractionError'),
        t('reviewScan.extractionErrorMessage'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    // Validate required fields
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

    onSave({
      merchant,
      amount,
      category: selectedCategory,
      paymentMethod,
      date: selectedDate,
      notes,
      imageUri,
    });
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
            {/* Merchant Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Merchant</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter merchant name"
                placeholderTextColor={colors.textSecondary}
                value={merchant}
                onChangeText={setMerchant}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
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
              <Text style={styles.label}>Category</Text>
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

            {/* Date Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
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
              <Text style={styles.label}>Notes (Optional)</Text>
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
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
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
});
