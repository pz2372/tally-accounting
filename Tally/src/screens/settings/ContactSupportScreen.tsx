import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { createAuthenticatedAxios, logout } from '../../services/authService';
import { signInWithEmail } from '../../config/firebase';

interface ContactSupportScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  currentUser?: { email?: string } | null;
}

export default function ContactSupportScreen({ onBack, onLogout, currentUser }: ContactSupportScreenProps) {
  const { t } = useContext(LanguageContext);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const faqs = [
    {
      icon: 'people-outline' as const,
      question: t('contactSupport.faq1'),
      answer: t('contactSupport.faq1Answer'),
    },
    {
      icon: 'camera-outline' as const,
      question: t('contactSupport.faq2'),
      answer: t('contactSupport.faq2Answer'),
    },
    {
      icon: 'create-outline' as const,
      question: t('contactSupport.faq3'),
      answer: t('contactSupport.faq3Answer'),
    },
    {
      icon: 'language-outline' as const,
      question: t('contactSupport.faq4'),
      answer: t('contactSupport.faq4Answer'),
    },
    {
      icon: 'key-outline' as const,
      question: t('contactSupport.faq5'),
      answer: t('contactSupport.faq5Answer'),
    },
  ];

  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert(t('contactSupport.missingInfo'), t('contactSupport.fillAllFields'));
      return;
    }

    setIsSending(true);
    try {
      const api = await createAuthenticatedAxios();
      await api.post('/api/support', {
        subject: subject.trim(),
        message: message.trim(),
      });

      Alert.alert(t('contactSupport.messageSent'), t('contactSupport.responseTime'), [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (error: any) {
      // Alert is shown below
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send message. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await signInWithEmail(currentUser?.email || '', deletePassword);
      if (error) {
        Alert.alert('Error', 'Incorrect password. Please try again.');
        setIsDeleting(false);
        return;
      }

      const api = await createAuthenticatedAxios();
      await api.delete('/api/auth/account');

      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to delete account. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  const handleDeleteAccountPress = () => {
    setShowDeleteWarning(true);
  };

  const handleConfirmWarning = () => {
    setShowDeleteWarning(false);
    setShowPasswordModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteWarning(false);
    setShowPasswordModal(false);
    setDeletePassword('');
    setIsDeleting(false);
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
            <Text style={styles.title}>{t('contactSupport.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>{t('contactSupport.sendMessage')}</Text>
              <Text style={styles.infoSubtitle}>{t('contactSupport.responseTime')}</Text>
            </View>
          </View>

          {/* Contact Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('contactSupport.subject')}</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder={t('contactSupport.subjectPlaceholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('contactSupport.message')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder={t('contactSupport.messagePlaceholder')}
                multiline
                numberOfLines={6}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>{t('contactSupport.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FAQs Section */}
          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>{t('contactSupport.faq')}</Text>
            {faqs.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.faqItem,
                  expandedFaq === index && styles.faqItemExpanded,
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.create(300, 'easeInEaseOut', 'opacity'));
                  setExpandedFaq(expandedFaq === index ? null : index);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <View style={[
                    styles.faqIconContainer,
                    expandedFaq === index && styles.faqIconContainerActive,
                  ]}>
                    <Ionicons
                      name={faq.icon}
                      size={18}
                      color={expandedFaq === index ? colors.surface : colors.primary}
                    />
                  </View>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={expandedFaq === index ? colors.primary : colors.textTertiary}
                  />
                </View>
                {expandedFaq === index && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Delete Account Section */}
          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccountPress}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>{t('contactSupport.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Delete Warning Modal */}
      <Modal
        visible={showDeleteWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="warning" size={48} color="#EF4444" />
            <Text style={styles.deleteModalTitle}>{t('contactSupport.deleteAccount')}</Text>
            <Text style={styles.deleteModalMessage}>
              {t('contactSupport.deleteWarning')}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelDelete}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteButton} onPress={handleConfirmWarning}>
                <Text style={styles.confirmDeleteButtonText}>{t('common.continue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('contactSupport.confirmPassword')}</Text>
              <TouchableOpacity onPress={handleCancelDelete}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t('common.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder={t('contactSupport.enterPassword')}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={[styles.saveButton, isDeleting && styles.saveButtonDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('common.confirm')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: spacing.xxxl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.xxl,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 0,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500',
  },
  quickContact: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.lg,
  },
  quickContactItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  quickContactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  quickContactValue: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  faqSection: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
    letterSpacing: 0.3,
    textAlign : 'center',
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderWidth: 0,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  faqItemExpanded: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqIconContainerActive: {
    backgroundColor: colors.primary,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: spacing.md,
    marginLeft: 46,
    paddingTop: spacing.sm,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.textSecondary + '2',
    lineHeight: 20,
  },
  form: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
  deleteSection: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 0,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
  passwordModalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
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
