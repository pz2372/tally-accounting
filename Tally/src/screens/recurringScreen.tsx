import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface RecurringScreenProps {
  onBack: () => void;
}

interface RecurringCharge {
  id: number;
  vendor: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBillingDate: string;
  isActive: boolean;
  lastCharge: string;
}

export default function RecurringScreen({ onBack }: RecurringScreenProps) {
  const { t } = useContext(LanguageContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChargeId, setDeleteChargeId] = useState<number | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Software & SaaS');
  const [newFrequency, setNewFrequency] = useState<'monthly' | 'yearly' | 'weekly' | 'quarterly'>('monthly');
  const [recurringDate, setRecurringDate] = useState('');
  
  const [charges, setCharges] = useState<RecurringCharge[]>([
    {
      id: 1,
      vendor: 'Adobe Creative Cloud',
      category: 'Software & SaaS',
      amount: 54.99,
      frequency: 'monthly',
      nextBillingDate: 'Feb 15, 2026',
      isActive: true,
      lastCharge: 'Jan 15, 2026',
    },
    {
      id: 2,
      vendor: 'Microsoft Office 365',
      category: 'Software & SaaS',
      amount: 99.99,
      frequency: 'yearly',
      nextBillingDate: 'Aug 1, 2026',
      isActive: true,
      lastCharge: 'Aug 1, 2025',
    },
    {
      id: 3,
      vendor: 'Zoom Pro',
      category: 'Software & SaaS',
      amount: 14.99,
      frequency: 'monthly',
      nextBillingDate: 'Feb 22, 2026',
      isActive: true,
      lastCharge: 'Jan 22, 2026',
    },
    {
      id: 4,
      vendor: 'Amazon Web Services',
      category: 'Software & SaaS',
      amount: 125.00,
      frequency: 'monthly',
      nextBillingDate: 'Feb 28, 2026',
      isActive: true,
      lastCharge: 'Jan 28, 2026',
    },
    {
      id: 5,
      vendor: 'Dropbox Business',
      category: 'Software & SaaS',
      amount: 20.00,
      frequency: 'monthly',
      nextBillingDate: 'Feb 10, 2026',
      isActive: false,
      lastCharge: 'Dec 10, 2025',
    },
  ]);

  const toggleCharge = (id: number) => {
    setCharges(charges.map(charge => 
      charge.id === id ? { ...charge, isActive: !charge.isActive } : charge
    ));
  };

  const getFrequencyColor = (frequency: RecurringCharge['frequency']) => {
    switch (frequency) {
      case 'weekly':
        return colors.purple;
      case 'monthly':
        return colors.blue;
      case 'quarterly':
        return colors.orange;
      case 'yearly':
        return colors.primary;
      default:
        return colors.gray;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Software & SaaS':
        return 'cloud';
      case 'Utilities':
        return 'flash';
      case 'Subscriptions':
        return 'newspaper';
      default:
        return 'repeat';
    }
  };

  const activeCharges = charges.filter(c => c.isActive);
  const inactiveCharges = charges.filter(c => !c.isActive);
  const totalMonthlyAmount = activeCharges
    .filter(c => c.frequency === 'monthly')
    .reduce((sum, c) => sum + c.amount, 0);
  const totalYearlyAmount = activeCharges
    .filter(c => c.frequency === 'yearly')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('recurring.title')}</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Active Charges */}
          {activeCharges.length > 0 && (
            <View style={styles.section}>
              <View style={styles.chargesList}>
                {activeCharges.map((charge) => (
                  <TouchableOpacity key={charge.id} style={styles.chargeCard} activeOpacity={0.7}>
                    {/* Content */}
                    <View style={styles.chargeContent}>
                      <Text style={styles.chargeVendor}>{charge.vendor}</Text>
                      <View style={styles.chargeTags}>
                        <View style={[styles.categoryBadge, { backgroundColor: getFrequencyColor(charge.frequency) }]}>
                          <Text style={styles.categoryText}>{charge.category}</Text>
                        </View>
                      </View>
                      {charge.nextBillingDate && (
                        <View style={styles.dateRow}>
                          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                          <Text style={styles.recurringDate}>{charge.nextBillingDate}</Text>
                        </View>
                      )}
                    </View>

                    {/* Right Side */}
                    <View style={styles.chargeRight}>
                      <Text style={styles.chargeAmount}>${charge.amount.toFixed(2)}</Text>
                      <TouchableOpacity 
                        style={styles.trashButton}
                        onPress={() => {
                          setDeleteChargeId(charge.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.red} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: spacing.lg }} />
              <Text style={styles.modalTitle}>Delete Recurring Charge?</Text>
              <Text style={styles.modalMessage}>Are you sure you want to delete this recurring charge? This action cannot be undone.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalDeleteButton}
                  onPress={() => {
                    if (deleteChargeId !== null) {
                      setCharges(charges.filter(c => c.id !== deleteChargeId));
                    }
                    setShowDeleteModal(false);
                    setDeleteChargeId(null);
                  }}
                >
                  <Text style={styles.modalDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Recurring Charge Modal */}
        <Modal
          visible={showAddModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.modalTitle}>Add Recurring Charge</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter name"
                  placeholderTextColor={colors.textSecondary}
                  value={newVendor}
                  onChangeText={setNewVendor}
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={newAmount}
                    onChangeText={setNewAmount}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Category Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <Text style={styles.pickerButtonText}>{newCategory}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {showCategoryPicker && (
                  <View style={styles.pickerDropdown}>
                    {['Software & SaaS', 'Utilities', 'Subscriptions', 'Other'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={styles.pickerItem}
                        onPress={() => {
                          setNewCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={styles.pickerItemText}>{cat}</Text>
                        {newCategory === cat && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Recurring Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recurring Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 15th of each month"
                  placeholderTextColor={colors.textSecondary}
                  value={recurringDate}
                  onChangeText={setRecurringDate}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  // Add logic to save new charge
                  setShowAddModal(false);
                  setNewVendor('');
                  setNewAmount('');
                }}
              >
                <Text style={styles.saveButtonText}>Add Recurring Charge</Text>
              </TouchableOpacity>
            </ScrollView>
            </View>
          </View>
        </Modal>
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
  headerButton: {
    padding: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chargesList: {
    gap: spacing.md,
  },
  chargeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chargeContent: {
    flex: 1,
    gap: spacing.sm,
  },
  chargeVendor: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 0,
  },
  chargeTags: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    color: colors.surface,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  recurringDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chargeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chargeAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trashButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  editModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScrollContent: {
    flexGrow: 0,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerDropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
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
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
