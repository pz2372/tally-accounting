import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';

const BUSINESS_DETAILS_KEY = '@business_details';

interface BusinessDetailsScreenProps {
  onBack: () => void;
  currentUser?: {
    organizations?: Array<{ id: string; name: string }>;
  } | null;
}

export default function BusinessDetailsScreen({ onBack, currentUser }: BusinessDetailsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [industry, setIndustry] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadBusinessDetails = async () => {
      try {
        // First try to load from cache
        const cachedData = await AsyncStorage.getItem(BUSINESS_DETAILS_KEY);
        if (cachedData && isActive) {
          const parsed = JSON.parse(cachedData);
          setBusinessName(parsed.businessName || '');
          setTaxId(parsed.taxId || '');
          setAddress(parsed.address || '');
          setIndustry(parsed.industry || '');
        } else if (currentUser?.organizations?.[0] && isActive) {
          // Fall back to currentUser organization if no cache
          setBusinessName(currentUser.organizations[0].name || '');
        }
      } catch (error) {
        console.warn('Failed to load business details:', error);
        // Fall back to currentUser on error
        if (currentUser?.organizations?.[0] && isActive) {
          setBusinessName(currentUser.organizations[0].name || '');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBusinessDetails();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const handleSaveChanges = async () => {
    try {
      const businessData = {
        businessName: businessName.trim(),
        taxId: taxId.trim(),
        address: address.trim(),
        industry: industry.trim(),
      };
      
      await AsyncStorage.setItem(BUSINESS_DETAILS_KEY, JSON.stringify(businessData));
      
      Alert.alert(
        t('common.done'),
        'Business details updated successfully',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      console.warn('Failed to save business details:', error);
      Alert.alert(
        'Error',
        'Failed to save changes. Please try again.'
      );
    }
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
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
              onPress={handleSaveChanges}
              disabled={isLoading}
            >
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
