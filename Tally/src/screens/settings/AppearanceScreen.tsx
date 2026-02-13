import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

interface AppearanceScreenProps {
  onBack: () => void;
}

export default function AppearanceScreen({ onBack }: AppearanceScreenProps) {
  const { t } = useContext(LanguageContext);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'auto'>('light');

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
            <Text style={styles.title}>{t('appearance.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Theme Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('appearance.theme')}</Text>
            
            <TouchableOpacity 
              style={[styles.themeOption, selectedTheme === 'light' && styles.themeOptionSelected]}
              onPress={() => setSelectedTheme('light')}
            >
              <View style={styles.themeLeft}>
                <Ionicons name="sunny" size={24} color={colors.textPrimary} />
                <View>
                  <Text style={styles.themeLabel}>{t('appearance.light')}</Text>
                  <Text style={styles.themeDescription}>{t('appearance.lightDesc')}</Text>
                </View>
              </View>
              {selectedTheme === 'light' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.themeOption, selectedTheme === 'dark' && styles.themeOptionSelected]}
              onPress={() => setSelectedTheme('dark')}
            >
              <View style={styles.themeLeft}>
                <Ionicons name="moon" size={24} color={colors.textPrimary} />
                <View>
                  <Text style={styles.themeLabel}>{t('appearance.dark')}</Text>
                  <Text style={styles.themeDescription}>{t('appearance.darkDesc')}</Text>
                </View>
              </View>
              {selectedTheme === 'dark' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.themeOption, selectedTheme === 'auto' && styles.themeOptionSelected]}
              onPress={() => setSelectedTheme('auto')}
            >
              <View style={styles.themeLeft}>
                <Ionicons name="phone-portrait" size={24} color={colors.textPrimary} />
                <View>
                  <Text style={styles.themeLabel}>{t('appearance.auto')}</Text>
                  <Text style={styles.themeDescription}>{t('appearance.autoDesc')}</Text>
                </View>
              </View>
              {selectedTheme === 'auto' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
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
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
