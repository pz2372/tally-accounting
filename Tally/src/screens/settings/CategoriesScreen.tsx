import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getAccessToken } from '../../services/authService';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface CategoriesScreenProps {
  onBack: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  visibleToEmployees: boolean;
  presetId?: string; // Added to track preset category ID
}

// Map category keys to preset IDs (these would come from API in production)
const CATEGORY_KEYS_TO_PRESET_ID: Record<string, string> = {
  'miscellaneous': 'preset_misc',
  'labor': 'preset_labor',
  'inventory': 'preset_inventory',
  'operations': 'preset_operations',
  'tax': 'preset_tax',
  'transportation': 'preset_transport',
};

export default function CategoriesScreen({ onBack }: CategoriesScreenProps) {
  const { t } = useContext(LanguageContext);
  
  const initialCategories: Category[] = [
    { id: '1', name: t('categories.miscellaneous'), icon: 'apps-outline', color: '#6B7280', isActive: true, visibleToEmployees: true, presetId: 'preset_misc' },
    { id: '2', name: t('categories.labor'), icon: 'people-outline', color: colors.purple, isActive: true, visibleToEmployees: true, presetId: 'preset_labor' },
    { id: '3', name: t('categories.inventory'), icon: 'cube-outline', color: '#10B981', isActive: true, visibleToEmployees: true, presetId: 'preset_inventory' },
    { id: '4', name: t('categories.operations'), icon: 'settings-outline', color: '#F59E0B', isActive: true, visibleToEmployees: true, presetId: 'preset_operations' },
    { id: '5', name: t('categories.tax'), icon: 'calculator-outline', color: colors.red, isActive: true, visibleToEmployees: true, presetId: 'preset_tax' },
    { id: '6', name: t('categories.transportation'), icon: 'car-outline', color: colors.blue, isActive: true, visibleToEmployees: true, presetId: 'preset_transport' },
  ];
  
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [originalCategories, setOriginalCategories] = useState<Category[]>(initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes whenever categories update
  useEffect(() => {
    const changed = categories.some((cat, index) => 
      cat.isActive !== originalCategories[index].isActive ||
      cat.visibleToEmployees !== originalCategories[index].visibleToEmployees
    );
    setHasChanges(changed);
  }, [categories, originalCategories]);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
    ));
  };

  const toggleVisibility = (id: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, visibleToEmployees: !cat.visibleToEmployees } : cat
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Prepare batch update payload
      const updates = categories.map(cat => ({
        presetCategoryId: cat.presetId,
        isEnabled: cat.isActive,
        visibleToEmployees: cat.visibleToEmployees
      }));

      // Call API
      const response = await axios.put(
        `${API_URL}/api/categories/batch`,
        { categories: updates },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.data.success) {
        // Update original state to match current
        setOriginalCategories([...categories]);
        setHasChanges(false);
        Alert.alert('Success', 'Categories updated successfully');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update categories');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.error || error.message || 'Failed to save changes'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const swipeHandlers = useSwipeBack(onBack);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('settings.categories')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {t('categories.infoText')}
            </Text>
          </View>

          {/* Categories List */}
          <View style={styles.section}>
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    !category.isActive && styles.categoryItemInactive,
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                      <Ionicons 
                        name={category.icon as any} 
                        size={22} 
                        color={category.isActive ? category.color : colors.textTertiary} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryName,
                      !category.isActive && styles.categoryNameInactive
                    ]}>
                      {category.name}
                    </Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleVisibility(category.id);
                      }}
                      style={styles.visibilityButton}
                      activeOpacity={0.6}
                    >
                      <Ionicons 
                        name={category.visibleToEmployees ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={category.visibleToEmployees ? colors.textSecondary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                    <View style={[
                      styles.checkbox,
                      category.isActive && styles.checkboxActive
                    ]}>
                      {category.isActive && (
                        <Ionicons name="checkmark" size={18} color={colors.surface} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Save Button - Scrolls with content */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges || isSaving) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {t('common.saveChanges') || 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  categoryRow: {
    marginBottom: spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryItemInactive: {
    backgroundColor: colors.background,
    opacity: 0.6,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  categoryNameInactive: {
    color: colors.textSecondary,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  visibilityButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveButtonContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
