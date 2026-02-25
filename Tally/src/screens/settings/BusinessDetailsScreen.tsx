import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { createAuthenticatedAxios } from '../../services/authService';

interface BusinessDetailsScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
  currentUser?: {
    organizations?: Array<{ id: string; name: string }>;
  } | null;
}

export default function BusinessDetailsScreen({ onBack, currentUser, selectedOrgId }: BusinessDetailsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [businessName, setBusinessName] = useState('');
  const [dba, setDba] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const orgId = selectedOrgId || currentUser?.organizations?.[0]?.id;
  const selectedOrg = orgId
    ? currentUser?.organizations?.find(o => o.id === orgId)
    : currentUser?.organizations?.[0];

  useEffect(() => {
    let isActive = true;

    const loadBusinessDetails = async () => {
      setIsLoading(true);
      try {
        const cacheKey = orgId ? `@business_details_${orgId}` : '@business_details';
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData && isActive) {
          const parsed = JSON.parse(cachedData);
          setBusinessName(parsed.businessName || '');
          setDba(parsed.dba || '');
          setTaxId(parsed.taxId || '');
          setAddress(parsed.address || '');
        } else if (selectedOrg && isActive) {
          setBusinessName(selectedOrg.name || '');
          setDba((selectedOrg as any).dba || '');
          setTaxId('');
          setAddress('');
        }
      } catch (error) {
        // silently fail - falls back to selectedOrg prop below
        if (selectedOrg && isActive) {
          setBusinessName(selectedOrg.name || '');
          setDba((selectedOrg as any).dba || '');
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
  }, [orgId]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Save org name to backend
      if (orgId) {
        const api = await createAuthenticatedAxios();
        await api.put('/api/organizations',
          { name: businessName.trim(), dba: dba.trim() || null, ein: taxId.trim() || null },
          { headers: { 'x-org-id': orgId } }
        );
      }

      // Cache all fields locally (org-scoped)
      const cacheKey = orgId ? `@business_details_${orgId}` : '@business_details';
      const businessData = {
        businessName: businessName.trim(),
        dba: dba.trim(),
        taxId: taxId.trim(),
        address: address.trim(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(businessData));
      
      Alert.alert(
        t('common.done'),
        'Business details updated successfully',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error: any) {
      // Alert is shown below
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save changes. Please try again.'
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
            <Text style={styles.title}>{t('businessDetails.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('businessDetails.businessName')}</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={businessName}
                editable={false}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>DBA (Doing Business As)</Text>
              <TextInput
                style={styles.input}
                value={dba}
                onChangeText={setDba}
                placeholder="Enter DBA name"
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
              style={[styles.saveButton, (isLoading || isSaving) && styles.saveButtonDisabled]} 
              onPress={handleSaveChanges}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>{t('businessDetails.saveChanges')}</Text>
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
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
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
