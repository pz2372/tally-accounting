import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';

interface BusinessDetailsScreenProps {
  onBack: () => void;
}

export default function BusinessDetailsScreen({ onBack }: BusinessDetailsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [businessName, setBusinessName] = useState('Acme Corporation');
  const [taxId, setTaxId] = useState('12-3456789');
  const [address, setAddress] = useState('123 Main St, San Francisco, CA 94105');
  const [industry, setIndustry] = useState('Technology');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('businessDetails.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('businessDetails.businessName')}</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder={t('businessDetails.enterBusinessName')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('businessDetails.taxId')}</Text>
              <TextInput
                style={styles.input}
                value={taxId}
                onChangeText={setTaxId}
                placeholder={t('businessDetails.enterTaxId')}
                keyboardType="numeric"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('businessDetails.address')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder={t('businessDetails.enterAddress')}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('businessDetails.industry')}</Text>
              <TextInput
                style={styles.input}
                value={industry}
                onChangeText={setIndustry}
                placeholder={t('businessDetails.enterIndustry')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{t('businessDetails.saveChanges')}</Text>
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
  form: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
