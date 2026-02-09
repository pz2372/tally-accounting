import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';

const USER_PROFILE_KEY = '@user_profile';

interface AccountInfoScreenProps {
  onBack: () => void;
  currentUser?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  } | null;
}

export default function AccountInfoScreen({ onBack, currentUser }: AccountInfoScreenProps) {
  const { t } = useContext(LanguageContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadUserProfile = async () => {
      try {
        // First try to load from cache
        const cachedData = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (cachedData && isActive) {
          const parsed = JSON.parse(cachedData);
          setName(parsed.name || '');
          setEmail(parsed.email || '');
          setPhone(parsed.phone || '');
        } else if (currentUser && isActive) {
          // Fall back to currentUser prop if no cache
          setName(currentUser.name || '');
          setEmail(currentUser.email || '');
          setPhone(currentUser.phoneNumber || '');
        }
      } catch (error) {
        console.warn('Failed to load user profile:', error);
        // Fall back to currentUser prop on error
        if (currentUser && isActive) {
          setName(currentUser.name || '');
          setEmail(currentUser.email || '');
          setPhone(currentUser.phoneNumber || '');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadUserProfile();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const handleSaveChanges = async () => {
    try {
      const profileData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };
      
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
      
      Alert.alert(
        t('common.done'),
        'Profile updated successfully',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (error) {
      console.warn('Failed to save user profile:', error);
      Alert.alert(
        'Error',
        'Failed to save changes. Please try again.'
      );
    }
  };

  const getInitials = (nameValue?: string, emailValue?: string) => {
    if (nameValue && nameValue.trim()) {
      const parts = nameValue.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 'U';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (emailValue && emailValue.trim()) {
      return emailValue.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const userInitials = getInitials(name, email);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('accountInfo.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('accountInfo.fullName')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('accountInfo.enterName')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('accountInfo.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('accountInfo.enterEmail')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('accountInfo.phoneNumber')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('accountInfo.enterPhone')}
                keyboardType="phone-pad"
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
              <Text style={styles.saveButtonText}>{t('accountInfo.saveChanges')}</Text>
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
    paddingBottom: spacing.xl,
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
