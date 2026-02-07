import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import DatePickerModal from '../components/DatePickerModal';
import ScanScreen from './scanScreen';

interface NewExpenseScreenProps {
  onBack: () => void;
}

export default function NewExpenseScreen({ onBack }: NewExpenseScreenProps) {
  const { t } = useContext(LanguageContext);
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Select Category');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showScanScreen, setShowScanScreen] = useState(false);

  const categories = [
    'Software & SaaS',
    'Travel',
    'Office Supplies',
    'Meals & Drinks',
    'Equipment',
    'Marketing',
    'Utilities',
    'Miscellaneous',
  ];

  const handleTakePhoto = () => {
    setShowReceiptModal(false);
    setShowScanScreen(true);
  };
  
  const handleCaptureComplete = (imageUri: string) => {
    setSelectedReceipt(imageUri);
    setShowScanScreen(false);
  };
  
  const handleChooseFromLibrary = async () => {
    setShowReceiptModal(false);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Photo library permission is required');
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

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving expense:', { vendor, amount, selectedCategory, selectedDate, notes, receipt: selectedReceipt });
    onBack();
  };

  return (
    <>
      {showScanScreen ? (
        <ScanScreen 
          onCancel={() => setShowScanScreen(false)}
          onSave={(imageUri) => handleCaptureComplete(imageUri)}
        />
      ) : (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('newExpense.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vendor Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.vendor')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('newExpense.vendorPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={vendor}
              onChangeText={setVendor}
            />
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.amount')}</Text>
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.category')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={[
                styles.pickerButtonText,
                selectedCategory === 'Select Category' && styles.pickerPlaceholder
              ]}>
                {selectedCategory}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.pickerDropdown}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{category}</Text>
                    {selectedCategory === category && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Receipt Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.receipt')}</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => setShowReceiptModal(true)}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>
                {selectedReceipt ? 'Change Receipt' : t('newExpense.uploadReceipt')}
              </Text>
            </TouchableOpacity>
            {selectedReceipt && (
              <View style={styles.receiptPreview}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.receiptPreviewText}>Receipt attached</Text>
                <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('newExpense.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder={t('newExpense.notesPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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
            onDateChange={(event, date) => {
              if (date) {
                setSelectedDate(date);
              }
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        {/* Receipt Options Modal */}
        <Modal
          visible={showReceiptModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReceiptModal(false)}
          >
            <View style={styles.receiptModalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.receiptModalTitle}>{t('newExpense.uploadReceipt')}</Text>
              
              <TouchableOpacity 
                style={styles.receiptOption}
                onPress={handleTakePhoto}
              >
                <View style={styles.receiptOptionIcon}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
                <Text style={styles.receiptOptionText}>{t('newExpense.takePhoto')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.receiptOption}
                onPress={handleChooseFromLibrary}
              >
                <View style={styles.receiptOptionIcon}>
                  <Ionicons name="images" size={24} color={colors.primary} />
                </View>
                <Text style={styles.receiptOptionText}>{t('newExpense.chooseFromLibrary')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
          </View>
        </SafeAreaView>
      )}
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
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    color: colors.textSecondary,
  },
  pickerDropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    fontSize: 15,
    color: colors.textPrimary,
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
  notesInput: {
    minHeight: 100,
    paddingTop: spacing.md,
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
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  receiptPreviewText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  receiptModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  receiptOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  receiptOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
