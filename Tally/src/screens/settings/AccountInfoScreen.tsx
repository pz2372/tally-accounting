import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';

interface AccountInfoScreenProps {
  onBack: () => void;
}

export default function AccountInfoScreen({ onBack }: AccountInfoScreenProps) {
  const { t } = useContext(LanguageContext);
  const [name, setName] = useState('Peter Zhang');
  const [email, setEmail] = useState('peter@acmecorp.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');

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
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <View style={styles.photoCircle}>
              <Text style={styles.photoInitials}>PZ</Text>
            </View>
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>{t('accountInfo.changePhoto')}</Text>
            </TouchableOpacity>
          </View>

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
            <TouchableOpacity style={styles.saveButton}>
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.surface,
  },
  changePhotoButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
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
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
