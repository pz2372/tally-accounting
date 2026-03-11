import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, PermissionsAndroid, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../styles/theme';
import ReviewScanScreen from './reviewScanScreen';

interface ScanScreenProps {
  onCancel: () => void;
  onExpenseSaved?: () => void;
  selectedOrgId?: string | null;
  defaultDocumentType?: 'receipt' | 'sales_report';
}

export default function ScanScreen({ onCancel, onExpenseSaved, selectedOrgId, defaultDocumentType }: ScanScreenProps) {
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    // Open scanner automatically when screen is opened
    if (!scannedImage) {
      scanDocument();
    }
  }, []);

  const scanDocument = async () => {
    try {
      setIsScanning(true);

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Tally needs camera access to scan receipts and sales reports',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Camera permission is required to scan documents');
          onCancel();
          return;
        }
      } else {
        const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
        if (existingStatus === 'denied') {
          Alert.alert(
            'Camera Access Required',
            'Tally needs camera access to scan documents. Please enable it in Settings.',
            [
              { text: 'Cancel', onPress: onCancel, style: 'cancel' },
              { text: 'Open Settings', onPress: () => { Linking.openSettings(); onCancel(); } },
            ]
          );
          return;
        }
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          onCancel();
          return;
        }
      }

      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 60,
        maxNumDocuments: 1,
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        setScannedImage(scannedImages[0]);
        setShowReview(true);
      } else {
        // User cancelled
        onCancel();
      }
    } catch (error) {
      onCancel();
    } finally {
      setIsScanning(false);
    }
  };

  const handleReviewBack = () => {
    setShowReview(false);
    setScannedImage(null);
    onCancel();
  };

  return (
    <>
      {showReview && scannedImage ? (
        <ReviewScanScreen
          imageUri={scannedImage}
          onBack={handleReviewBack}
          selectedOrgId={selectedOrgId}
          defaultDocumentType={defaultDocumentType}
          onSuccess={() => {
            setShowReview(false);
            setScannedImage(null);
            if (onExpenseSaved) {
              onExpenseSaved();
            } else {
              onCancel();
            }
          }}
        />
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          {isScanning && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Opening Scanner...</Text>
            </View>
          )}
        </SafeAreaView>
      )}
    </>
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
});
