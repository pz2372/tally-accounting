import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface AlertItem {
  id: number;
  type: 'missing-receipt' | 'unmatched-receipt' | 'duplicate' | 'review';
  title: string;
  description: string;
  date: string;
  day: number;
  amount?: number;
  vendor?: string;
}

interface AlertDetailScreenProps {
  alert: AlertItem;
  onBack: () => void;
  onResolve: () => void;
}

export default function AlertDetailScreen({ alert, onBack, onResolve }: AlertDetailScreenProps) {
  const { t } = useContext(LanguageContext);
  const [notes, setNotes] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const handleScan = async () => {
    setShowReceiptModal(false);
    
    // Wait for modal to fully dismiss before opening camera
    setTimeout(async () => {
      try {
        // Request camera permissions
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (permissionResult.granted === false) {
          RNAlert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
        
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelectedReceipt(result.assets[0].uri);
        }
      } catch (error) {
        console.log('Camera cancelled or error:', error);
      }
    }, 300);
  };

  const handleChooseFromLibrary = async () => {
    setShowReceiptModal(false);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      RNAlert.alert('Permission Required', 'Photo library permission is required');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedReceipt(result.assets[0].uri);
      RNAlert.alert('Success', 'Receipt attached successfully');
    }
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedReceipt(result.assets[0].uri);
        RNAlert.alert('Success', 'File uploaded successfully');
      }
    } catch (err) {
      RNAlert.alert('Error', 'Failed to upload file');
    }
  };

  const getAlertColor = (type: AlertItem['type']) => {
    switch (type) {
      case 'missing-receipt':
        return colors.red;
      case 'unmatched-receipt':
        return colors.orange;
      case 'duplicate':
        return colors.purple;
      case 'review':
        return colors.blue;
      default:
        return colors.red;
    }
  };

  const getActionText = (type: AlertItem['type']) => {
    switch (type) {
      case 'missing-receipt':
        return t('alertDetail.uploadReceipt');
      case 'unmatched-receipt':
        return t('alertDetail.matchToTransaction');
      case 'duplicate':
        return t('alertDetail.reviewTransaction');
      case 'review':
        return t('alertDetail.reviewDetails');
      default:
        return t('alertDetail.resolve');
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
          <Text style={styles.headerTitle}>{t('alertDetail.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Alert Type Badge */}
          <View style={styles.typeBadgeContainer}>
            <View style={[styles.typeBadge, { backgroundColor: `${getAlertColor(alert.type)}15` }]}>
              <Text style={[styles.typeText, { color: getAlertColor(alert.type) }]}>
                {alert.type === 'missing-receipt' && t('alertDetail.missingReceipt')}
                {alert.type === 'unmatched-receipt' && t('alertDetail.unmatchedReceipt')}
                {alert.type === 'duplicate' && t('alertDetail.duplicate')}
                {alert.type === 'review' && t('alertDetail.review')}
              </Text>
            </View>
          </View>

          {/* Transaction Details */}
          <View style={styles.detailsCard}>
            <View style={styles.tagsContainer}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{t('alertDetail.uncategorized')}</Text>
              </View>
            </View>
            <Text style={styles.vendorName}>{alert.vendor}</Text>
            <Text style={styles.amount}>${alert.amount?.toFixed(2)}</Text>
            <Text style={styles.description}>Expense requiring attention</Text>
            <Text style={styles.expenseDate}>{alert.date} {alert.day}, 2026</Text>
          </View>

          {/* Issue Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('alertDetail.issue')}</Text>
            <Text style={styles.issueDescription}>{alert.description}</Text>
          </View>

          {/* Suggested Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('alertDetail.suggestedActions')}</Text>
            
            {alert.type === 'missing-receipt' && (
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => setShowReceiptModal(true)}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>{t('alertDetail.uploadReceipt')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleUploadFile}
                >
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>{t('alertDetail.uploadFromFiles')}</Text>
                </TouchableOpacity>
              </>
            )}

            {alert.type === 'unmatched-receipt' && (
              <>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="link-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>{t('alertDetail.linkToStatement')}</Text>
                </TouchableOpacity>
              </>
            )}

            {alert.type === 'duplicate' && (
              <>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="git-merge-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>{t('alertDetail.mergeTransactions')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={20} color={colors.red} />
                  <Text style={[styles.actionButtonText, { color: colors.red }]}>{t('alertDetail.deleteDuplicate')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.dismissButton} onPress={onBack}>
            <Text style={styles.dismissButtonText}>{t('alertDetail.dismiss')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.resolveButton, { backgroundColor: getAlertColor(alert.type) }]}
            onPress={onResolve}
          >
            <Text style={styles.resolveButtonText}>{getActionText(alert.type)}</Text>
          </TouchableOpacity>
        </View>

        {/* Receipt Options Modal */}
        <Modal
          visible={showReceiptModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReceiptModal(false)}
          >
            <View style={styles.receiptModalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.receiptModalTitle}>{t('alertDetail.uploadReceipt')}</Text>
              
              <TouchableOpacity 
                style={styles.receiptOption}
                onPress={handleScan}
              >
                <View style={styles.receiptOptionIcon}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
                <Text style={styles.receiptOptionText}>{t('alertDetail.scan')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.receiptOption}
                onPress={handleChooseFromLibrary}
              >
                <View style={styles.receiptOptionIcon}>
                  <Ionicons name="images" size={24} color={colors.primary} />
                </View>
                <Text style={styles.receiptOptionText}>{t('alertDetail.chooseFromLibrary')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowReceiptModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('alertDetail.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  typeBadgeContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  expenseDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    marginBottom: spacing.md,
  },
  categoryTag: {
    backgroundColor: colors.gray,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  categoryTagText: {
    fontSize: 13,
    color: colors.surface,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  issueDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  dismissButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resolveButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
  },
  resolveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  receiptModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  receiptOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  receiptOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
