import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';
import { CATEGORIES, getCategoryColor } from '../components/categories';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { getAccessToken } from '../services/authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Check';

const PAYMENT_METHODS: { label: PaymentMethod; icon: string; apiValue: string }[] = [
  { label: 'Credit Card', icon: 'card-outline',    apiValue: 'CREDIT_CARD' },
  { label: 'Debit Card',  icon: 'card-outline',    apiValue: 'DEBIT_CARD'  },
  { label: 'Cash',        icon: 'cash-outline',    apiValue: 'CASH'        },
  { label: 'Check',       icon: 'receipt-outline', apiValue: 'CHECK'       },
];

interface NewExpenseScreenProps {
  onBack: () => void;
}

export default function NewExpenseScreen({ onBack }: NewExpenseScreenProps) {
  const { t } = useContext(LanguageContext);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('newExpense.permissionRequired'), t('newExpense.cameraPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedReceipt(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('newExpense.permissionRequired'), t('newExpense.libraryPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedReceipt(result.assets[0].uri);
    }
  };

  const handleReceiptPress = () => {
    Alert.alert(
      t('newExpense.addReceipt'),
      t('newExpense.chooseOption'),
      [
        { text: t('newExpense.takePhoto'),         onPress: handleTakePhoto },
        { text: t('newExpense.chooseFromLibrary'), onPress: handleChooseFromLibrary },
        { text: t('common.cancel'),                style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation', 'Please select a category.');
      return;
    }

    setSaving(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const userRaw = await AsyncStorage.getItem('@current_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const orgId = user?.organizations?.[0]?.id;
      if (!orgId) {
        Alert.alert('Error', 'No organization found. Please log in again.');
        return;
      }

      const amountCents = Math.round(parseFloat(amount) * 100);
      const paymentEntry = PAYMENT_METHODS.find(p => p.label === paymentMethod)!;
      const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'x-org-id': orgId,
      };

      let savedExpense: any;

      if (selectedReceipt) {
        const formData = new FormData();
        formData.append('receipt', { uri: selectedReceipt, type: 'image/jpeg', name: 'receipt.jpg' } as any);
        formData.append('amountCents', String(amountCents));
        formData.append('paymentMethod', paymentEntry.apiValue);
        formData.append('expenseDate', selectedDate.toISOString());
        formData.append('categoryName', selectedCategory);
        if (merchant.trim()) formData.append('merchant', merchant.trim());
        if (notes.trim())    formData.append('notes', notes.trim());

        const res = await fetch(`${API_URL}/api/expenses/with-receipt`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save expense');
        savedExpense = data.expense;
      } else {
        const res = await fetch(`${API_URL}/api/expenses`, {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountCents,
            paymentMethod: paymentEntry.apiValue,
            expenseDate: selectedDate.toISOString(),
            categoryName: selectedCategory,
            merchant: merchant.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save expense');
        savedExpense = data.expense;
      }

      // Prepend to local expense cache so it shows up immediately
      if (savedExpense) {
        const cacheKey = `@org_expenses_${orgId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        const cachedList = cached ? JSON.parse(cached) : [];
        await AsyncStorage.setItem(cacheKey, JSON.stringify([savedExpense, ...cachedList]));
      }

      Alert.alert('Saved', 'Expense saved successfully.', [{ text: 'OK', onPress: onBack }]);
    } catch (err: any) {
      console.error('Save expense error:', err);
      Alert.alert('Error', err.message || 'Failed to save expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const swipeHandlers = useSwipeBack(onBack);
  const selectedPayment = PAYMENT_METHODS.find(p => p.label === paymentMethod)!;

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('newExpense.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {
            if (showCategoryPicker) setShowCategoryPicker(false);
            if (showPaymentPicker) setShowPaymentPicker(false);
          }}
        >
          {/* Merchant Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.merchant')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('newExpense.merchantPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={merchant}
              onChangeText={setMerchant}
            />
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.amount')}</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder={t('newExpense.amountPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Category Picker */}
          <View style={[styles.inputGroup, showCategoryPicker && styles.inputGroupActive]}>
            <Text style={styles.label}>{t('newExpense.category')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={styles.pickerButtonContent}>
                {selectedCategory && (
                  <View style={[styles.categoryColorDot, { backgroundColor: getCategoryColor(selectedCategory) }]} />
                )}
                <Text style={[styles.pickerButtonText, !selectedCategory && styles.pickerPlaceholder]}>
                  {selectedCategory || t('newExpense.selectCategory')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <Pressable style={styles.pickerDropdown} onPress={(e) => e.stopPropagation()}>
                <ScrollView style={styles.pickerDropdownScroll} nestedScrollEnabled>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.pickerItem, selectedCategory === category && styles.pickerItemSelected]}
                      onPress={() => { setSelectedCategory(category); setShowCategoryPicker(false); }}
                    >
                      <View style={styles.pickerItemContent}>
                        <View style={[styles.categoryColorDot, { backgroundColor: getCategoryColor(category) }]} />
                        <Text style={[styles.pickerItemText, selectedCategory === category && styles.pickerItemTextSelected]}>
                          {category}
                        </Text>
                      </View>
                      {selectedCategory === category && <Ionicons name="checkmark" size={18} color={colors.primary} />}
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
                <Ionicons name={selectedPayment.icon as any} size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.pickerButtonText}>{paymentMethod}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showPaymentPicker && (
              <Pressable style={styles.pickerDropdown} onPress={(e) => e.stopPropagation()}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm.label}
                    style={[styles.pickerItem, paymentMethod === pm.label && styles.pickerItemSelected]}
                    onPress={() => { setPaymentMethod(pm.label); setShowPaymentPicker(false); }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Ionicons name={pm.icon as any} size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                      <Text style={[styles.pickerItemText, paymentMethod === pm.label && styles.pickerItemTextSelected]}>
                        {pm.label}
                      </Text>
                    </View>
                    {paymentMethod === pm.label && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </Pressable>
            )}
          </View>

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.date')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.pickerButtonText}>
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.notes')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('newExpense.notesPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Receipt Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.receipt')}</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleReceiptPress}>
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>
                {selectedReceipt ? t('newExpense.changeReceipt') : t('newExpense.uploadReceipt')}
              </Text>
            </TouchableOpacity>
            {selectedReceipt && (
              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{t('newExpense.receipt')}</Text>
                <Image source={{ uri: selectedReceipt }} style={styles.receiptImage} resizeMode="contain" />
                <TouchableOpacity style={styles.removeReceiptButton} onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.surface} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={styles.saveButtonText}>{t('newExpense.save')}</Text>
            }
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DatePickerModal
            visible={showDatePicker}
            selectedDate={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        </View>
        </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerRight: { width: 40 },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  inputGroup: { marginBottom: spacing.xl, position: 'relative', zIndex: 1 },
  inputGroupActive: { zIndex: 1000 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: 15, color: colors.textPrimary,
  },
  amountInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginRight: spacing.xs },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  pickerButtonContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerButtonText: { fontSize: 15, color: colors.textPrimary },
  pickerPlaceholder: { color: colors.textSecondary },
  pickerDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: spacing.xs,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1,
    borderColor: colors.border, maxHeight: 300, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, overflow: 'hidden',
  },
  pickerDropdownScroll: { maxHeight: 300 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  pickerItemSelected: { backgroundColor: colors.background },
  pickerItemContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerItemText: { fontSize: 15, color: colors.textPrimary },
  pickerItemTextSelected: { fontWeight: '600', color: colors.primary },
  categoryColorDot: { width: 10, height: 10, borderRadius: 5 },
  uploadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary,
    borderStyle: 'dashed', borderRadius: borderRadius.lg, paddingVertical: spacing.xl, gap: spacing.sm,
  },
  uploadButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  saveButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, marginBottom: spacing.lg, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: colors.surface },
  receiptSection: { marginTop: spacing.md, position: 'relative' },
  receiptSectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  receiptImage: {
    width: '100%', height: 300, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border,
  },
  removeReceiptButton: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 20, padding: spacing.xs,
  },
});
