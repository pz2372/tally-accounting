import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { CATEGORIES, getCategoryColor } from '../components/categories';
import { getCachedData, CACHE_KEYS } from '../services/cacheService';
import { getAccessToken, refreshAccessToken } from '../services/authService';
import axios from 'axios';
import { useSwipeBack } from '../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Map category keys to display names
const CATEGORY_KEY_TO_NAME: Record<string, string> = {
  'miscellaneous': 'Miscellaneous',
  'labor': 'Labor',
  'inventory': 'Inventory',
  'operations': 'Operations',
  'tax': 'Tax',
  'transportation': 'Transportation',
};

interface RecurringScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

interface RecurringCharge {
  id: string | number;
  vendor: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBillingDate: string;
  isActive: boolean;
  lastCharge: string;
}

export default function RecurringScreen({ onBack, selectedOrgId }: RecurringScreenProps) {
  const { t } = useContext(LanguageContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChargeId, setDeleteChargeId] = useState<string | number | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Operations');
  const [newFrequency, setNewFrequency] = useState<'monthly' | 'yearly' | 'weekly' | 'quarterly'>('monthly');
  const [recurringDate, setRecurringDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [charges, setCharges] = useState<RecurringCharge[]>([]);

  useEffect(() => {
    loadRecurringCharges();
  }, [selectedOrgId]);

  const loadRecurringCharges = async () => {
    let firstOrgId: string | undefined;
    try {
      setIsLoading(true);

      firstOrgId = selectedOrgId || undefined;
      if (!firstOrgId) {
        const userStr = await AsyncStorage.getItem('@current_user');
        if (!userStr) { setIsLoading(false); return; }
        const user = JSON.parse(userStr);
        firstOrgId = user.organizations?.[0]?.id;
      }
      if (!firstOrgId) { setIsLoading(false); return; }

      // Try to load from cache first, but always fetch from server to ensure freshness
      const cachedCharges = await getCachedData(`${CACHE_KEYS.ORG_RECURRING_CHARGES}${firstOrgId}`);

      if (cachedCharges && Array.isArray(cachedCharges) && cachedCharges.length > 0) {
        console.log('Loading recurring charges from cache');
        setCharges(cachedCharges);
        // Continue to fetch fresh data from server below
      }

      // Fetch from server to ensure fresh data
      console.log('Fetching recurring charges from server');
      
      const token = await getAccessToken();
      if (!token) {
        console.log('No auth token available');
        setCharges([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/api/recurring-charges`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Org-Id': firstOrgId
            }
          }
        );

        if (response.data.success && response.data.charges) {
          // Transform server data to match RecurringCharge interface
          const transformedCharges: RecurringCharge[] = response.data.charges.map((charge: any) => ({
            id: charge.id,
            vendor: charge.name,
            category: charge.categoryKey ? CATEGORY_KEY_TO_NAME[charge.categoryKey] || 'Operations' : 'Operations',
            amount: charge.amountCents / 100,
            frequency: 'monthly', // Server only supports monthly currently
            nextBillingDate: charge.nextRunAt ? new Date(charge.nextRunAt).toLocaleDateString() : '',
            isActive: charge.status === 'ACTIVE',
            lastCharge: charge.lastRunAt ? new Date(charge.lastRunAt).toLocaleDateString() : ''
          }));

          // Save to cache
          await AsyncStorage.setItem(
            `${CACHE_KEYS.ORG_RECURRING_CHARGES}${firstOrgId}`,
            JSON.stringify(transformedCharges)
          );
          
          setCharges(transformedCharges);
        } else {
          setCharges([]);
        }
      } catch (apiError: any) {
        // If 401, try refreshing token and retry once
        if (apiError.response?.status === 401) {
          console.log('Token expired, refreshing and retrying...');
          const newToken = await refreshAccessToken();
          
          if (newToken) {
            const retryResponse = await axios.get(
              `${API_URL}/api/recurring-charges`,
              {
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                  'X-Org-Id': firstOrgId
                }
              }
            );

            if (retryResponse.data.success && retryResponse.data.charges) {
              const transformedCharges: RecurringCharge[] = retryResponse.data.charges.map((charge: any) => ({
                id: charge.id,
                vendor: charge.name,
                category: charge.categoryKey ? CATEGORY_KEY_TO_NAME[charge.categoryKey] || 'Operations' : 'Operations',
                amount: charge.amountCents / 100,
                frequency: 'monthly',
                nextBillingDate: charge.nextRunAt ? new Date(charge.nextRunAt).toLocaleDateString() : '',
                isActive: charge.status === 'ACTIVE',
                lastCharge: charge.lastRunAt ? new Date(charge.lastRunAt).toLocaleDateString() : ''
              }));

              await AsyncStorage.setItem(
                `${CACHE_KEYS.ORG_RECURRING_CHARGES}${firstOrgId}`,
                JSON.stringify(transformedCharges)
              );
              
              setCharges(transformedCharges);
            }
          } else {
            throw apiError; // If refresh failed, throw original error
          }
        } else {
          throw apiError; // If not 401, throw error
        }
      }
    } catch (error: any) {
      // silently fail - show cached data if available
      // If there's an error fetching, still show cached data if available
      if (firstOrgId) {
        const cachedCharges = await getCachedData(`${CACHE_KEYS.ORG_RECURRING_CHARGES}${firstOrgId}`);
        setCharges(cachedCharges || []);
      } else {
        setCharges([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCharge = async () => {
    if (deleteChargeId === null) return;

    try {
      setIsSaving(true);

      // Get current user data for authentication
      const currentUserStr = await AsyncStorage.getItem('@current_user');
      if (!currentUserStr) {
        Alert.alert('Error', 'Please log in to delete recurring charges');
        return;
      }

      const currentUser = JSON.parse(currentUserStr);
      const token = await getAccessToken();
      const orgId = selectedOrgId || currentUser.organizations?.[0]?.id;

      if (!token || !orgId) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Call API to delete the charge
      await axios.delete(
        `${API_URL}/api/recurring-charges/${deleteChargeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': orgId
          }
        }
      );

      // Update local state by removing the deleted charge
      const updatedCharges = charges.filter(c => c.id !== deleteChargeId);
      setCharges(updatedCharges);

      // Update cache
      await AsyncStorage.setItem(
        `${CACHE_KEYS.ORG_RECURRING_CHARGES}${orgId}`,
        JSON.stringify(updatedCharges)
      );

      // Close modal and reset state
      setShowDeleteModal(false);
      setDeleteChargeId(null);

      // Show success message
      Alert.alert('Success', 'Recurring charge deleted successfully');

    } catch (error) {
      // Alert is shown below
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert('Error', error.response.data.error || 'Failed to delete recurring charge');
      } else {
        Alert.alert('Error', 'Failed to delete recurring charge');
      }
    } finally {
      setIsSaving(false);
    }
  };

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
      case 'Miscellaneous':
        return 'apps-outline';
      case 'Labor':
        return 'people-outline';
      case 'Inventory':
        return 'cube-outline';
      case 'Operations':
        return 'settings-outline';
      case 'Tax':
        return 'calculator-outline';
      case 'Transportation':
        return 'car-outline';
      default:
        return 'repeat';
    }
  };

  const handleAddCharge = async () => {
    try {
      // Validate inputs
      if (!newVendor.trim()) {
        Alert.alert('Validation Error', 'Please enter a vendor name');
        return;
      }

      if (!newAmount.trim() || parseFloat(newAmount) <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid amount');
        return;
      }

      if (!recurringDate.trim()) {
        Alert.alert('Validation Error', 'Please enter a recurring day (1-28)');
        return;
      }

      const dayOfMonth = parseInt(recurringDate, 10);
      if (dayOfMonth < 1 || dayOfMonth > 28) {
        Alert.alert('Validation Error', 'Recurring day must be between 1 and 28');
        return;
      }

      setIsSaving(true);

      // Get auth token and user info
      const token = await getAccessToken();
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) {
        Alert.alert('Error', 'User information not found');
        return;
      }

      const user = JSON.parse(userStr);
      const orgId = selectedOrgId || user.organizations?.[0]?.id;
      if (!orgId) {
        Alert.alert('Error', 'Organization not found');
        return;
      }

      // Prepare request data
      const amountCents = Math.round(parseFloat(newAmount) * 100);
      const startDate = new Date();
      startDate.setDate(dayOfMonth);
      if (startDate < new Date()) {
        startDate.setMonth(startDate.getMonth() + 1);
      }

      const requestData = {
        name: newVendor.trim(),
        merchant: newVendor.trim(),
        amountCents,
        currency: 'USD',
        categoryName: newCategory,
        dayOfMonth,
        useLastDay: false,
        startDate: startDate.toISOString()
      };

      // Make API call
      const response = await axios.post(
        `${API_URL}/api/recurring-charges`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Org-Id': orgId
          }
        }
      );

      if (response.data.success) {
        // Update local state with new charge
        const newCharge: RecurringCharge = {
          id: response.data.charge.id, // Use cuid string directly
          vendor: response.data.charge.name,
          category: newCategory,
          amount: amountCents / 100,
          frequency: 'monthly',
          nextBillingDate: new Date(response.data.charge.nextRunAt).toLocaleDateString(),
          isActive: true,
          lastCharge: ''
        };

        const updatedCharges = [newCharge, ...charges];
        setCharges(updatedCharges);

        // Update cache
        await AsyncStorage.setItem(
          `${CACHE_KEYS.ORG_RECURRING_CHARGES}${orgId}`,
          JSON.stringify(updatedCharges)
        );

        // Reset form and close modal
        setNewVendor('');
        setNewAmount('');
        setNewCategory('Operations');
        setRecurringDate('');
        setShowAddModal(false);
        setShowCategoryPicker(false);

        Alert.alert('Success', 'Recurring charge added successfully');
      }
    } catch (error: any) {
      // Alert is shown below
      
      // Handle 401 authentication errors
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add recurring charge';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
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

  const swipeHandlers = useSwipeBack(onBack);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : charges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="repeat-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t('recurring.emptyTitle')}</Text>
              <Text style={styles.emptySubtext}>{t('recurring.emptySubtitle')}</Text>
            </View>
          ) : (
            <>
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
                        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(charge.category) }]}>
                          <Text style={styles.categoryText}>
                            {CATEGORIES.includes(charge.category)
                              ? t('categories.' + charge.category.toLowerCase())
                              : charge.category}
                          </Text>
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
            </>
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
              <Text style={styles.modalTitle}>{t('recurring.deleteTitle')}</Text>
              <Text style={styles.modalMessage}>{t('recurring.deleteMessage')}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalDeleteButton}
                  onPress={handleDeleteCharge}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalDeleteText}>{t('common.delete')}</Text>
                  )}
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
                <Text style={styles.modalTitle}>{t('recurring.addTitle')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('recurring.name')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('recurring.namePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={newVendor}
                  onChangeText={setNewVendor}
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('recurring.amount')}</Text>
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
              <View style={[styles.inputGroup, showCategoryPicker && styles.inputGroupActive]}>
                <Text style={styles.inputLabel}>{t('recurring.category')}</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <View style={styles.pickerButtonContent}>
                    <View style={[
                      styles.categoryColorDot,
                      { backgroundColor: getCategoryColor(newCategory) }
                    ]} />
                    <Text style={styles.pickerButtonText}>{t('categories.' + newCategory.toLowerCase())}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {showCategoryPicker && (
                  <Pressable
                    style={styles.pickerDropdown}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <ScrollView style={styles.pickerDropdownScroll} nestedScrollEnabled>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.pickerItem,
                            newCategory === cat && styles.pickerItemSelected
                          ]}
                          onPress={() => {
                            setNewCategory(cat);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <View style={styles.pickerItemContent}>
                            <View style={[
                              styles.categoryColorDot,
                              { backgroundColor: getCategoryColor(cat) }
                            ]} />
                            <Text style={[
                              styles.pickerItemText,
                              newCategory === cat && styles.pickerItemTextSelected
                            ]}>{t('categories.' + cat.toLowerCase())}</Text>
                          </View>
                          {newCategory === cat && (
                            <Ionicons name="checkmark" size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </Pressable>
                )}
              </View>

              {/* Recurring Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('recurring.recurringDay')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1-28"
                  placeholderTextColor={colors.textSecondary}
                  value={recurringDate}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    
                    // If empty or valid number between 1-28, update
                    if (numericValue === '') {
                      setRecurringDate('');
                    } else {
                      const day = parseInt(numericValue, 10);
                      if (day >= 1 && day <= 28) {
                        setRecurringDate(numericValue);
                      } else if (day > 28) {
                        setRecurringDate('28');
                      }
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              {/* Interval (Disabled) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('recurring.interval')}</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={t('recurring.monthly')}
                  editable={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleAddCharge}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('recurring.addButton')}</Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
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
    overflow: 'visible',
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
    overflow: 'visible',
  },
  inputGroup: {
    marginBottom: spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  inputGroupActive: {
    zIndex: 1000,
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
  disabledInput: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    opacity: 0.6,
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
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  pickerDropdownScroll: {
    maxHeight: 250,
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
  saveButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
