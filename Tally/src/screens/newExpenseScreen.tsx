import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';
import { CATEGORIES, getCategoryColor } from '../components/categories';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface NewExpenseScreenProps {
  onBack: () => void;
}

export default function NewExpenseScreen({ onBack }: NewExpenseScreenProps) {
  const { t } = useContext(LanguageContext);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Debit Card' | 'Cash'>('Credit Card');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

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
        {
          text: t('newExpense.takePhoto'),
          onPress: handleTakePhoto,
        },
        {
          text: t('newExpense.chooseFromLibrary'),
          onPress: handleChooseFromLibrary,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSave = () => {
    // TODO: Implement save logic
    onBack();
  };

  const swipeHandlers = useSwipeBack(onBack);

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
                        <View style={[
                          styles.categoryColorDot,
                          { backgroundColor: getCategoryColor(category) }
                        ]} />
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
            <Text style={styles.label}>{t('newExpense.date')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
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
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleReceiptPress}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>
                {selectedReceipt ? t('newExpense.changeReceipt') : t('newExpense.uploadReceipt')}
              </Text>
            </TouchableOpacity>
            {selectedReceipt && (
              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{t('newExpense.receipt')}</Text>
                <Image
                  source={{ uri: selectedReceipt }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
                <TouchableOpacity 
                  style={styles.removeReceiptButton}
                  onPress={() => setSelectedReceipt(null)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.surface} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{t('newExpense.save')}</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
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
    paddingVertical: spacing.lg
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  receiptSection: {
    marginTop: spacing.md,
    position: 'relative',
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
  removeReceiptButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: spacing.xs,
  },
});
