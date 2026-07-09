import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getAccessToken } from '../../services/authService';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { getFullCategorySettings } from '../../components/categories';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface CategoriesScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

interface Category {
  id: string;
  key: string; // Category key (e.g., 'miscellaneous', 'labor')
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  visibleToEmployees: boolean;
}

export default function CategoriesScreen({ onBack, selectedOrgId }: CategoriesScreenProps) {
  const { t } = useContext(LanguageContext);
  
  const initialCategories: Category[] = getFullCategorySettings().map(category => ({
    id: category.key,
    key: category.key,
    name: category.name,
    icon: category.icon,
    color: category.color,
    isActive: category.isEnabled,
    visibleToEmployees: category.visibleToEmployees,
  }));
  
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [originalCategories, setOriginalCategories] = useState<Category[]>(initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const mergeCategorySettings = (settings: any[] = []): Category[] => {
    return getFullCategorySettings(settings).map(category => ({
      id: category.key,
      key: category.key,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isActive: category.isEnabled,
      visibleToEmployees: category.visibleToEmployees,
    }));
  };

  const toCachedCategorySettings = (settings: any[] = []) => {
    return getFullCategorySettings(settings);
  };

  // Load current category settings from cache first, then fetch from server
  useEffect(() => {
    const loadCategories = async () => {
      // Step 1: Try to load from AsyncStorage cache first (instant)
      if (selectedOrgId) {
        try {
          const cached = await AsyncStorage.getItem(`@org_categories_${selectedOrgId}`);
          if (cached) {
            const cachedCategories = JSON.parse(cached);
            const mappedCategories = mergeCategorySettings(cachedCategories);
            setCategories(mappedCategories);
            setOriginalCategories(mappedCategories);
            await AsyncStorage.setItem(
              `@org_categories_${selectedOrgId}`,
              JSON.stringify(toCachedCategorySettings(mappedCategories))
            );
          }
        } catch {
          // Silently fail - cache might not exist
        }
      }

      // Step 2: Fetch fresh data from server in parallel
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;

        const response = await axios.get(`${API_URL}/api/categories`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
          }
        });

        if (response.data.success && response.data.categories) {
          const serverCategories = mergeCategorySettings(response.data.categories);
          setCategories(serverCategories);
          setOriginalCategories(serverCategories);
          if (selectedOrgId) {
            await AsyncStorage.setItem(
              `@org_categories_${selectedOrgId}`,
              JSON.stringify(toCachedCategorySettings(response.data.categories))
            ).catch(() => {
              // Silently fail - non-critical cache update
            });
          }
        }
      } catch {
        // Silently fail - use cache or default categories
      }
    };

    loadCategories();
  }, [selectedOrgId]);

  // Check for changes whenever categories update
  useEffect(() => {
    const changed = categories.some((cat, index) =>
      cat.isActive !== originalCategories[index]?.isActive ||
      cat.visibleToEmployees !== originalCategories[index]?.visibleToEmployees
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
        Alert.alert(t('common.error') || 'Error', t('categories.loginAgain') || 'Please log in again');
        return;
      }

      // Prepare batch update payload
      const updates = categories.map(cat => ({
        key: cat.key,
        isEnabled: cat.isActive,
        visibleToEmployees: cat.visibleToEmployees
      }));

      // Call API
      const response = await axios.put(
        `${API_URL}/api/categories/batch`,
        { categories: updates },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
          }
        }
      );

      if (response.data.success) {
        // Reload categories from server to ensure UI is in sync
        const refreshResponse = await axios.get(`${API_URL}/api/categories`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(selectedOrgId ? { 'x-org-id': selectedOrgId } : {}),
          }
        });

        if (refreshResponse.data.success && refreshResponse.data.categories) {
          const serverCategories = mergeCategorySettings(refreshResponse.data.categories);
          setCategories(serverCategories);
          setOriginalCategories(serverCategories);

          // Update AsyncStorage cache to keep it in sync with server
          if (selectedOrgId) {
            await AsyncStorage.setItem(
              `@org_categories_${selectedOrgId}`,
              JSON.stringify(toCachedCategorySettings(refreshResponse.data.categories))
            ).catch(() => {
              // Silently fail - non-critical cache update
            });
          }
        } else {
          // Fallback: just update original to current
          setOriginalCategories([...categories]);
        }

        setHasChanges(false);
        Alert.alert(t('common.success'), t('categories.updateSuccess') || 'Categories updated successfully');
      } else {
        Alert.alert(t('common.error') || 'Error', response.data.error || t('categories.updateError') || 'Failed to update categories');
      }
    } catch (error: any) {
      // Alert is shown below
      Alert.alert(
        t('common.error') || 'Error',
        error.response?.data?.error || error.message || t('categories.saveError') || 'Failed to save changes'
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
                      {t('categories.' + category.key) || category.name}
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
