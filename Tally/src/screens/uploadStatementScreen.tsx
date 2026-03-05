import React, { useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getAccessToken } from '../services/authService';
import DatePickerModal from '../components/DatePickerModal';
// import ScanScreen from './scanScreen';
import { useSwipeBack } from '../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface UploadStatementScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

// type UploadType = 'dailySales' | 'monthlyStatement';

export default function UploadStatementScreen({ onBack, selectedOrgId }: UploadStatementScreenProps) {
  const { t } = useContext(LanguageContext);
  // const [uploadType, setUploadType] = useState<UploadType>('monthlyStatement');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [statementName, setStatementName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  // const [showScanScreen, setShowScanScreen] = useState(false);
  const isPickingFileRef = useRef(false);

  const getOrgId = async (): Promise<string | null> => {
    if (selectedOrgId) return selectedOrgId;
    try {
      const userStr = await AsyncStorage.getItem('@current_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);
      return user.organizations?.[0]?.id || null;
    } catch {
      return null;
    }
  };

  const handleFilePick = async () => {
    if (isPickingFileRef.current) {
      return;
    }
    
    isPickingFileRef.current = true;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert(t('uploadStatement.error'), t('uploadStatement.errorMessage'));
    } finally {
      isPickingFileRef.current = false;
    }
  };

  // const handleScanStatement = () => {
  //   setShowScanScreen(true);
  // };

  const handleStatementPress = () => {
    handleFilePick();
  };

  const handleSave = async () => {
    if (!selectedFile) {
      Alert.alert(t('uploadStatement.noFileSelected'), t('uploadStatement.pleaseSelectFile'));
      return;
    }

    if (!statementName.trim()) {
      Alert.alert(t('common.validationError'), t('uploadStatement.pleaseEnterName'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const orgId = await getOrgId();
      if (!orgId) {
        Alert.alert(t('uploadStatement.error'), 'No organization found');
        setIsUploading(false);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication failed');
      }

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        if (progress <= 80) setUploadProgress(progress);
      }, 150);

      // Daily sales handled via scan screen
      {
        // Upload monthly bank statement with file
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || 'application/octet-stream',
          name: selectedFile.name,
        } as any);
        const statementMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        formData.append('provider', statementName.trim());
        formData.append('statementMonth', statementMonth);
        formData.append('sourceType', selectedFile.mimeType?.includes('pdf') ? 'pdf' : 'csv');

        const res = await fetch(`${API_URL}/api/statements/with-file`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-org-id': orgId,
          },
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        // Update statements cache
        try {
          const data = await res.json();
          if (data.success && data.statement) {
            const cacheKey = `@org_statements_${orgId}`;
            const cached = await AsyncStorage.getItem(cacheKey);
            const cachedList = cached ? JSON.parse(cached) : [];
            await AsyncStorage.setItem(cacheKey, JSON.stringify([data.statement, ...cachedList]));
          }
        } catch { }

        setTimeout(() => {
          setIsUploading(false);
          Alert.alert(t('common.success'), t('uploadStatement.statementSuccess'), [
            { text: t('common.ok'), onPress: onBack }
          ]);
        }, 300);
      }
    } catch (error: any) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = error?.response?.data?.error || t('uploadStatement.errorMessage');
      Alert.alert(t('uploadStatement.error'), errorMessage);
    }
  };

  const handleCancel = () => {
    onBack();
  };

  const swipeHandlers = useSwipeBack(onBack);

  // if (showScanScreen) {
  //   return (
  //     <ScanScreen
  //       onCancel={() => setShowScanScreen(false)}
  //       onExpenseSaved={() => {
  //         setShowScanScreen(false);
  //         onBack();
  //       }}
  //       selectedOrgId={selectedOrgId}
  //       defaultDocumentType={uploadType === 'dailySales' ? 'sales_report' : undefined}
  //     />
  //   );
  // }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('uploadStatement.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Upload Type Selector - daily sales handled via scan screen
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('uploadStatement.uploadType')}</Text>
            <View style={styles.typeSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.typeSelectorButton,
                  uploadType === 'dailySales' && styles.typeSelectorButtonActive,
                ]}
                onPress={() => setUploadType('dailySales')}
              >
                <Text style={[
                  styles.typeSelectorText,
                  uploadType === 'dailySales' && styles.typeSelectorTextActive,
                ]}>
                  {t('uploadStatement.dailySales')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeSelectorButton,
                  uploadType === 'monthlyStatement' && styles.typeSelectorButtonActive,
                ]}
                onPress={() => setUploadType('monthlyStatement')}
              >
                <Text style={[
                  styles.typeSelectorText,
                  uploadType === 'monthlyStatement' && styles.typeSelectorTextActive,
                ]}>
                  {t('uploadStatement.monthlyStatement')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          */}

          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('uploadStatement.statementName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('uploadStatement.enterStatementName')}
              placeholderTextColor={colors.textSecondary}
              value={statementName}
              onChangeText={setStatementName}
            />
          </View>

          {/* Date Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('common.date')}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Select Statement File */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('uploadStatement.selectStatementFile')}</Text>
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleStatementPress}
              disabled={isUploading}
            >
              <View style={styles.uploadIcon}>
                <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>
                {selectedFile ? t('uploadStatement.changeFile') : t('uploadStatement.selectFile')}
              </Text>
              <Text style={styles.uploadSubtitle}>
                {t('uploadStatement.tapToBrowse')}
              </Text>
            </TouchableOpacity>

            {/* Selected File */}
            {selectedFile && (
              <View style={styles.selectedFileCard}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document" size={24} color={colors.primary} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : t('uploadStatement.unknownSize')}
                  </Text>
                </View>
                {!isUploading && (
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{uploadProgress}% {t('uploadStatement.uploaded')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        {!isUploading && (
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{t('uploadStatement.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onDateChange={(date) => setSelectedDate(date)}
        onClose={() => setShowDatePicker(false)}
      />

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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  formatsList: {
    gap: spacing.sm,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formatText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  uploadSection: {
    marginBottom: spacing.xxl,
  },
  uploadArea: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginTop: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeSelectorButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeSelectorButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeSelectorTextActive: {
    color: colors.surface,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
});
