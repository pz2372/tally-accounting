import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

interface TermsConditionsScreenProps {
  onBack: () => void;
}

export default function TermsConditionsScreen({ onBack }: TermsConditionsScreenProps) {
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
            <Text style={styles.title}>Terms & Conditions</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>Last Updated: February 13, 2026</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By accessing and using this application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Use of Service</Text>
            <Text style={styles.paragraph}>
              You agree to use our service only for lawful purposes and in accordance with these Terms. You agree not to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Use the service in any way that violates any applicable law or regulation</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Transmit any viruses, malware, or other malicious code</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Attempt to gain unauthorized access to our systems</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Interfere with or disrupt the service or servers</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.paragraph}>
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Maintaining the confidentiality of your account credentials</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>All activities that occur under your account</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Notifying us immediately of any unauthorized use</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Financial Data</Text>
            <Text style={styles.paragraph}>
              Our service allows you to store and manage financial information. You acknowledge that:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>You are solely responsible for the accuracy of your data</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>We do not provide financial, tax, or legal advice</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>You should consult with qualified professionals for financial decisions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Subscription and Payments</Text>
            <Text style={styles.paragraph}>
              Some features of our service may require a paid subscription. By subscribing, you agree to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Pay all applicable fees for your chosen subscription plan</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Provide current, complete, and accurate billing information</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Automatic renewal unless cancelled before the renewal date</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
            <Text style={styles.paragraph}>
              The service and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Termination</Text>
            <Text style={styles.paragraph}>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including but not limited to breach of these Terms. Upon termination, your right to use the service will immediately cease.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
            <Text style={styles.paragraph}>
              The service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered, without regard to its conflict of law provisions.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Contact Information</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms, please contact us at:
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
