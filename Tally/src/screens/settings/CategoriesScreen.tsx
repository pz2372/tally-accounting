import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';

interface CategoriesScreenProps {
  onBack: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export default function CategoriesScreen({ onBack }: CategoriesScreenProps) {
  const { t } = useContext(LanguageContext);
  
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: t('categories.miscellaneous'), icon: 'apps-outline', color: '#6B7280', isActive: true },
    { id: '2', name: t('categories.labor'), icon: 'people-outline', color: colors.purple, isActive: true },
    { id: '3', name: t('categories.inventory'), icon: 'cube-outline', color: '#10B981', isActive: true },
    { id: '4', name: t('categories.operations'), icon: 'settings-outline', color: '#F59E0B', isActive: true },
    { id: '5', name: t('categories.tax'), icon: 'calculator-outline', color: colors.red, isActive: true },
    { id: '6', name: t('categories.transportation'), icon: 'car-outline', color: colors.blue, isActive: true },
  ]);

  const toggleCategory = (id: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {t('categories.infoText')}
            </Text>
          </View>

          {/* Categories List */}
          <View style={styles.section}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
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
                <View style={[
                  styles.checkbox,
                  category.isActive && styles.checkboxActive
                ]}>
                  {category.isActive && (
                    <Ionicons name="checkmark" size={18} color={colors.surface} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
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
    fontSize: 24,
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
});
