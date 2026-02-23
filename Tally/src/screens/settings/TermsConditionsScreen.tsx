import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../styles/theme';
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
            <Text style={styles.lastUpdatedText}>Last Updated: February 22, 2026</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By downloading, installing, and using Tally, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you may not use our Service. These Terms constitute the entire agreement between you and Tally regarding your use of the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.paragraph}>
              Tally is a mobile application designed to help restaurants, food service businesses, and similar establishments manage expenses, track receipts, and match financial transactions. The Service includes:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Expense tracking and categorization</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Receipt capture and OCR processing</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Bank transaction syncing via Plaid</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Receipt-to-transaction matching</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Financial reporting and analytics</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Team collaboration and role-based access</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Use License & Acceptable Use</Text>
            <Text style={styles.paragraph}>
              We grant you a limited, non-exclusive, non-transferable license to use Tally for lawful business purposes. You agree NOT to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Use the Service for any illegal or fraudulent purpose</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Reverse engineer, decompile, or attempt to derive the source code</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Transmit viruses, malware, or harmful code</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Attempt to gain unauthorized access to our systems or accounts</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Interfere with or disrupt the integrity or performance of the Service</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Remove any proprietary notices or labels</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Resell, redistribute, or sublicense the Service</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. User Accounts & Responsibility</Text>
            <Text style={styles.paragraph}>
              When you create an account, you must:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Provide accurate, complete, and truthful information</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Maintain the security and confidentiality of your credentials</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Take responsibility for all activities under your account</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Notify us immediately of unauthorized access</Text>
            </View>
            <Text style={styles.paragraph}>
              You are solely responsible for all activities, transactions, and communications on your account. We are not liable for unauthorized access due to your negligence.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Financial Data & Disclaimer</Text>
            <Text style={styles.paragraph}>
              Important Disclaimers:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>You are solely responsible for the accuracy of all financial data you enter</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Tally does NOT provide accounting, tax, or financial advice</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>You should consult with qualified CPAs or accountants for tax matters</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Automated receipt matching may occasionally produce false positives or negatives</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>You should regularly review all matched transactions for accuracy</Text>
            </View>
            <Text style={styles.paragraph}>
              We are not liable for any financial, tax, or accounting consequences resulting from your use of Tally.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Subscription Plans & Payments</Text>
            <Text style={styles.paragraph}>
              By subscribing to Tally, you agree to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Pay all fees according to your chosen subscription plan</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Provide current, valid billing information via Stripe</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Allow automatic renewal unless you cancel before the renewal date</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Cancellations must be made through the app settings</Text>
            </View>
            <Text style={styles.paragraph}>
              Refunds are issued according to our refund policy. There are no refunds for partial subscription periods except as required by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Organization Members & Access Control</Text>
            <Text style={styles.paragraph}>
              If you create an organization in Tally, you agree to:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Only invite authorized team members to access the organization</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Assign appropriate roles and permissions to members</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Maintain control of member access and promptly remove inactive users</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Take responsibility for actions taken by invited members</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Third-Party Integrations</Text>
            <Text style={styles.paragraph}>
              Tally integrates with third-party services including Plaid (for banking) and Stripe (for payments). Your use of these integrations is governed by their respective terms of service. We are not responsible for:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Service interruptions from third-party providers</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Changes to third-party APIs or services</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Data security practices of third-party providers</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Intellectual Property Rights</Text>
            <Text style={styles.paragraph}>
              The Tally application, including its design, features, functionality, and content, is owned by StrataLumen Labs and protected by copyright, trademark, and other intellectual property laws. You may not:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Copy or reproduce any part of the Service without permission</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Use our trademarks or logos without authorization</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Create derivative works based on Tally</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TALLY AND STRATALUMEN LABS SHALL NOT BE LIABLE FOR:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Indirect, incidental, or consequential damages</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Loss of data, profits, revenue, or business</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Service interruptions or technical failures</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Inaccurate receipt matching or financial calculations</Text>
            </View>
            <Text style={styles.paragraph}>
              Our total liability shall not exceed the amount you paid for Tally in the 12 months preceding the claim.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Disclaimer of Warranties</Text>
            <Text style={styles.paragraph}>
              TALLY IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Warranties of merchantability or fitness for a particular purpose</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Warranties of accuracy or completeness of data</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Warranties of uninterrupted or error-free service</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Indemnification</Text>
            <Text style={styles.paragraph}>
              You agree to indemnify and hold harmless Tally and StrataLumen Labs from any claims, damages, or costs arising from your violation of these Terms, misuse of the Service, or infringement of third-party rights through your use of the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Account Termination</Text>
            <Text style={styles.paragraph}>
              We may terminate your account immediately for:
            </Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Violation of these Terms</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Illegal or fraudulent activity</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Non-payment of subscription fees</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Misuse of the Service or threat to security</Text>
            </View>
            <Text style={styles.paragraph}>
              Upon termination, your access to the Service ceases immediately. You may request your data export before deletion, subject to applicable laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Data Backup & Recovery</Text>
            <Text style={styles.paragraph}>
              While we maintain backups for disaster recovery purposes, we are not responsible for data loss due to your failure to maintain your own backups. We recommend regularly exporting your data for safekeeping.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>15. Modifications to Service</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify, suspend, or discontinue any part of Tally at any time. We will provide reasonable notice of material changes that negatively impact your use of the Service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>16. Governing Law & Jurisdiction</Text>
            <Text style={styles.paragraph}>
              These Terms are governed by the laws of the United States, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in the jurisdiction where StrataLumen Labs is registered.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>17. Severability</Text>
            <Text style={styles.paragraph}>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>18. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We may update these Terms at any time. Material changes will be posted in the app with at least 30 days' notice. Continued use of Tally constitutes acceptance of the updated Terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>19. Contact & Support</Text>
            <Text style={styles.paragraph}>
              For questions about these Terms, account issues, or support requests, please contact us:
            </Text>
            <Text style={styles.contactText}>support@tallyapp.com</Text>
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
