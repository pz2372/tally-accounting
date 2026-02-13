import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export default function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  const { t } = useContext(LanguageContext);

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
            <Text style={styles.title}>Privacy Policy</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>Last Updated: February 13, 2026</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect information that you provide directly to us when you create an account, use our services, or communicate with us. This includes:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Account information (name, email, business details)</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Financial data (expenses, receipts, statements)</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Usage information and analytics</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use the information we collect to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Provide, maintain, and improve our services</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Process your transactions and manage your account</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Send you technical notices and support messages</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Detect and prevent fraud or unauthorized access</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. Your data is encrypted both in transit and at rest.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Sharing</Text>
            <Text style={styles.paragraph}>
              We do not sell your personal information. We may share your information only in the following circumstances:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>With your consent or at your direction</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>With service providers who assist us in operating our platform</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>To comply with legal obligations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Rights</Text>
            <Text style={styles.paragraph}>
              You have the right to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Access and receive a copy of your personal data</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Rectify or update your information</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Request deletion of your data</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Object to or restrict certain processing</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time through the app settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <Text style={styles.contactText}>support@acme.com</Text>
          </View>

          <View style={styles.bottomSpacing} />
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
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  lastUpdated: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  lastUpdatedText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
  },
  bullet: {
    fontSize: 15,
    color: colors.primary,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  contactText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  bottomSpacing: {
    height: spacing.xxl * 2,
  },
});
