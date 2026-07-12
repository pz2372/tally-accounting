import React, { useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getAccessToken } from '../services/authService';
import DatePickerModal from '../components/DatePickerModal';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { extractReceiptData } from '../services/aiService';
// @ts-ignore - legacy subpath has no type declarations but works at runtime
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface UploadStatementScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
}

type UploadType = 'salesStatement' | 'bankStatement';

export default function UploadStatementScreen({ onBack, selectedOrgId }: UploadStatementScreenProps) {
  const { t } = useContext(LanguageContext);
  const [uploadType, setUploadType] = useState<UploadType>('bankStatement');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [statementName, setStatementName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [grossSales, setGrossSales] = useState('');
  const [netSales, setNetSales] = useState('');
  const [cash, setCash] = useState('');
  const [tips, setTips] = useState('');
  const [tax, setTax] = useState('');
  const [discounts, setDiscounts] = useState('');
  const [refunds, setRefunds] = useState('');
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

  const clearSalesFields = () => {
    setMerchant('');
    setNotes('');
    setGrossSales('');
    setNetSales('');
    setCash('');
    setTips('');
    setTax('');
    setDiscounts('');
    setRefunds('');
  };

  const resetSelectedStatement = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadType('bankStatement');
    clearSalesFields();
  };

  const analyzeStatementImage = async (asset: DocumentPicker.DocumentPickerAsset) => {
    setIsExtracting(true);
    try {
      const orgId = await getOrgId();
      const extracted = await extractReceiptData(asset.uri, [], orgId);
      const isSalesStatement = extracted.documentType === 'sales_report'
        || Boolean(extracted.grossSales || extracted.netSales || extracted.cash);

      if (isSalesStatement) {
        setUploadType('salesStatement');
        setStatementName('');
        if (extracted.merchant) setMerchant(extracted.merchant);
        if (extracted.date) setSelectedDate(extracted.date);
        if (extracted.notes) setNotes(extracted.notes);
        if (extracted.grossSales) setGrossSales(extracted.grossSales);
        if (extracted.netSales) setNetSales(extracted.netSales);
        if (extracted.cash) setCash(extracted.cash);
        if (extracted.tips) setTips(extracted.tips);
        if (extracted.tax) setTax(extracted.tax);
        if (extracted.discounts) setDiscounts(extracted.discounts);
        if (extracted.refunds) setRefunds(extracted.refunds);
      } else {
        setUploadType('bankStatement');
        clearSalesFields();
      }
    } catch (error: any) {
      setUploadType('bankStatement');
      clearSalesFields();
      Alert.alert('Analysis Error', error?.message || 'Could not analyze the image. It will be saved as a bank statement.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFilePick = async () => {
    if (isPickingFileRef.current) {
      return;
    }
    
    isPickingFileRef.current = true;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset);
        clearSalesFields();
        setUploadType('bankStatement');
        if (asset.mimeType?.includes('image/jpeg') || asset.name?.toLowerCase().endsWith('.jpg') || asset.name?.toLowerCase().endsWith('.jpeg')) {
          await analyzeStatementImage(asset);
        }
      }
    } catch (err) {
      Alert.alert(t('uploadStatement.error'), t('uploadStatement.errorMessage'));
    } finally {
      isPickingFileRef.current = false;
    }
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t('uploadStatement.error'), 'Photo library permission is required to choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      const filename = image.fileName || image.uri.split('/').pop() || 'statement.jpg';
      const asset: DocumentPicker.DocumentPickerAsset = {
        uri: image.uri,
        name: filename,
        mimeType: image.mimeType || 'image/jpeg',
        size: image.fileSize,
        lastModified: Date.now(),
      };

      setSelectedFile(asset);
      clearSalesFields();
      setUploadType('bankStatement');
      await analyzeStatementImage(asset);
    }
  };

  const handleStatementPress = () => {
    Alert.alert(
      t('uploadStatement.selectStatementFile'),
      t('uploadStatement.tapToBrowse'),
      [
        { text: 'Choose Image', onPress: handleImagePick },
        { text: 'Choose File', onPress: handleFilePick },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const toCents = (value: string) => String(Math.round(parseFloat(value || '0') * 100));

  const saveSalesStatement = async (token: string, orgId: string) => {
    if (!selectedFile) {
      Alert.alert(t('uploadStatement.noFileSelected'), t('uploadStatement.pleaseSelectFile'));
      return false;
    }

    if (!grossSales.trim() && !netSales.trim()) {
      Alert.alert(t('common.validationError'), 'Please enter gross sales or net sales.');
      return false;
    }

    const parameters: Record<string, string> = {
      businessDate: selectedDate.toISOString(),
    };
    if (merchant.trim()) parameters.merchant = merchant.trim();
    if (notes.trim()) parameters.notes = notes.trim();
    if (grossSales.trim()) parameters.grossSalesCents = toCents(grossSales);
    if (netSales.trim()) parameters.netSalesCents = toCents(netSales);
    if (cash.trim()) parameters.cashCents = toCents(cash);
    if (tips.trim()) parameters.tipsCents = toCents(tips);
    if (tax.trim()) parameters.taxCents = toCents(tax);
    if (discounts.trim()) parameters.discountsCents = toCents(discounts);
    if (refunds.trim()) parameters.refundsCents = toCents(refunds);

    setUploadProgress(20);
    const uploadResult = await FileSystem.uploadAsync(`${API_URL}/api/sales-reports/with-receipt`, selectedFile.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      parameters,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-org-id': orgId,
      },
    });

    setUploadProgress(100);
    const data = JSON.parse(uploadResult.body);
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(data.error || 'Failed to save sales statement');
    }

    if (data.report) {
      const cacheKey = `@org_sales_reports_${orgId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      const cachedList = cached ? JSON.parse(cached) : [];
      await AsyncStorage.setItem(cacheKey, JSON.stringify([data.report, ...cachedList]));

      const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
      await AsyncStorage.removeItem(`${cacheKey}_${monthKey}`);
    }

    return true;
  };

  const handleSave = async () => {
    if (!selectedFile) {
      Alert.alert(t('uploadStatement.noFileSelected'), t('uploadStatement.pleaseSelectFile'));
      return;
    }

    if (uploadType === 'bankStatement' && !statementName.trim()) {
      Alert.alert(t('common.validationError'), t('uploadStatement.pleaseEnterName'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let progressInterval: ReturnType<typeof setInterval> | null = null;

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
      progressInterval = setInterval(() => {
        progress += 20;
        if (progress <= 80) setUploadProgress(progress);
      }, 150);

      if (uploadType === 'salesStatement') {
        const didSave = await saveSalesStatement(token, orgId);
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        if (!didSave) {
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        setTimeout(() => {
          setIsUploading(false);
          Alert.alert(t('common.success'), 'Sales statement saved successfully.', [
            { text: t('common.ok'), onPress: onBack }
          ]);
        }, 300);
      } else {
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

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
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
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = error?.message || error?.response?.data?.error || t('uploadStatement.errorMessage');
      Alert.alert(t('uploadStatement.error'), errorMessage);
    }
  };

  const handleCancel = () => {
    onBack();
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
          <Text style={styles.headerTitle}>{t('uploadStatement.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name Field */}
          {uploadType === 'bankStatement' && <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('uploadStatement.statementName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('uploadStatement.enterStatementName')}
              placeholderTextColor={colors.textSecondary}
              value={statementName}
              onChangeText={setStatementName}
            />
          </View>}

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
              disabled={isUploading || isExtracting}
            >
              <View style={styles.uploadIcon}>
                {isExtracting
                  ? <ActivityIndicator color={colors.primary} />
                  : <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />}
              </View>
              <Text style={styles.uploadTitle}>
                {isExtracting ? 'Analyzing statement...' : selectedFile ? t('uploadStatement.changeFile') : t('uploadStatement.selectFile')}
              </Text>
              <Text style={styles.uploadSubtitle}>
                {selectedFile && uploadType === 'salesStatement'
                  ? 'Detected sales statement'
                  : selectedFile
                    ? 'Detected bank statement'
                    : t('uploadStatement.tapToBrowse')}
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
                  <TouchableOpacity onPress={resetSelectedStatement}>
                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {uploadType === 'salesStatement' && selectedFile && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sales Data</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Merchant</Text>
                <TextInput style={styles.input} placeholder="Optional" placeholderTextColor={colors.textSecondary} value={merchant} onChangeText={setMerchant} />
              </View>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Gross Sales</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={grossSales} onChangeText={setGrossSales} keyboardType="decimal-pad" />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Net Sales</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={netSales} onChangeText={setNetSales} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Cash</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={cash} onChangeText={setCash} keyboardType="decimal-pad" />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Tips</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={tips} onChangeText={setTips} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Tax</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={tax} onChangeText={setTax} keyboardType="decimal-pad" />
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Discounts</Text>
                  <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={discounts} onChangeText={setDiscounts} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Refunds</Text>
                <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={refunds} onChangeText={setRefunds} keyboardType="decimal-pad" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput style={styles.input} placeholder="Optional" placeholderTextColor={colors.textSecondary} value={notes} onChangeText={setNotes} />
              </View>
            </View>
          )}

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
        {!isUploading && !isExtracting && (
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  rowItem: {
    flex: 1,
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
