import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface UploadStatementScreenProps {
  onBack: () => void;
}

export default function UploadStatementScreen({ onBack }: UploadStatementScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a statement file first');
      return;
    }

    setIsUploading(true);
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        Alert.alert('Success', 'Statement uploaded successfully', [
          { text: 'OK', onPress: onBack }
        ]);
      }
    }, 200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('uploadStatement.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              {t('uploadStatement.infoText')}
            </Text>
          </View>

          {/* Supported Formats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('uploadStatement.supportedFormats')}</Text>
            <View style={styles.formatsList}>
              <View style={styles.formatItem}>
                <Ionicons name="document-text" size={20} color={colors.textSecondary} />
                <Text style={styles.formatText}>{t('uploadStatement.pdfStatements')}</Text>
              </View>
              <View style={styles.formatItem}>
                <Ionicons name="document-text" size={20} color={colors.textSecondary} />
                <Text style={styles.formatText}>{t('uploadStatement.csvExcel')}</Text>
              </View>
              <View style={styles.formatItem}>
                <Ionicons name="document-text" size={20} color={colors.textSecondary} />
                <Text style={styles.formatText}>{t('uploadStatement.qfxOfx')}</Text>
              </View>
            </View>
          </View>

          {/* Upload Area */}
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleFilePick}
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
                    {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                  </Text>
                </View>
                {!isUploading && (
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{uploadProgress}% uploaded</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Upload Button */}
        {selectedFile && !isUploading && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>{t('uploadStatement.upload')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
