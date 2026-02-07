import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface ScanScreenProps {
  onCancel: () => void;
  onSave?: (imageUri: string) => void;
}

export default function ScanScreen({ onCancel, onSave }: ScanScreenProps) {
  const { t } = useContext(LanguageContext);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Open scanner automatically when screen is opened
    if (!scannedImage) {
      scanDocument();
    }
  }, []);

  const scanDocument = async () => {
    try {
      setIsScanning(true);
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
      });

      if (scannedImages && scannedImages.length > 0) {
        setScannedImage(scannedImages[0]);
      } else {
        // User cancelled - go back to previous tab
        onCancel();
      }
    } catch (error) {
      console.log('Scanner cancelled or error:', error);
      // User cancelled - go back to previous tab
      onCancel();
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = () => {
    if (scannedImage) {
      if (onSave) {
        // If onSave callback provided, use it (from newExpenseScreen)
        onSave(scannedImage);
      } else {
        // Otherwise show the alert (from capture tab)
        Alert.alert(
          'Save Receipt',
          'Receipt saved successfully!',
          [
            {
              text: 'Scan Another',
              onPress: () => {
                setScannedImage(null);
                scanDocument();
              },
            },
            {
              text: 'Done',
              onPress: () => setScannedImage(null),
            },
          ]
        );
      }
    }
  };

  const handleRetake = () => {
    setScannedImage(null);
    scanDocument();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isScanning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Opening Scanner...</Text>
        </View>
      )}
      {scannedImage && (
        <View style={styles.previewContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('scan.title')}</Text>
            <TouchableOpacity onPress={() => setScannedImage(null)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: scannedImage }}
              style={styles.scannedImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark" size={24} color={colors.surface} />
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  previewContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scannedImage: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.xxl,
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  retakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
