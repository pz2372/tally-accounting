import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

interface ExportDataScreenProps {
  onBack: () => void;
}

interface ExportOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function ExportDataScreen({ onBack }: ExportDataScreenProps) {
  const { t } = useContext(LanguageContext);
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions: ExportOption[] = [
    { key: 'expenses', label: 'Expenses', icon: 'receipt-outline', color: '#2563EB' },
    { key: 'statements', label: 'Statements', icon: 'document-text-outline', color: '#7C3AED' },
    { key: 'salesReports', label: 'Sales Reports', icon: 'bar-chart-outline', color: '#059669' },
    { key: 'categories', label: 'Categories', icon: 'pricetags-outline', color: '#9333EA' },
    { key: 'recurringCharges', label: 'Recurring Charges', icon: 'repeat-outline', color: '#D97706' },
  ];

  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(exportOptions.map(opt => [opt.key, true]))
  );

  const toggleOption = (key: string) => {
    setSelectedOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(selectedOptions).filter(Boolean).length;

  const handleExport = async () => {
    if (selectedCount === 0) {
      Alert.alert('No Data Selected', 'Please select at least one data type to export.');
      return;
    }

    setIsExporting(true);
    try {
      // TODO: Implement actual export via backend API
      const selected = Object.entries(selectedOptions)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      console.log('Exporting data types:', selected);

      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Export Complete',
        'Your data has been exported successfully.',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error: any) {
      console.warn('Export failed:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
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
            <Text style={styles.title}>Export Data</Text>
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
              Select the data you'd like to export. Files will be generated in CSV format.
            </Text>
          </View>

          {/* Data Options */}
          <View style={styles.section}>
            {exportOptions.map((option) => (
              <View key={option.key} style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    !selectedOptions[option.key] && styles.categoryItemInactive,
                  ]}
                  onPress={() => toggleOption(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                      <Ionicons 
                        name={option.icon} 
                        size={22} 
                        color={selectedOptions[option.key] ? option.color : colors.textTertiary} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryName,
                      !selectedOptions[option.key] && styles.categoryNameInactive
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    selectedOptions[option.key] && styles.checkboxActive
                  ]}>
                    {selectedOptions[option.key] && (
                      <Ionicons name="checkmark" size={18} color={colors.surface} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Export Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (isExporting || selectedCount === 0) && styles.saveButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={isExporting || selectedCount === 0}
              activeOpacity={0.8}
            >
              {isExporting ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Export {selectedCount} {selectedCount === 1 ? 'Category' : 'Categories'}
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
