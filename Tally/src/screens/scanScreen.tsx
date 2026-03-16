import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, PermissionsAndroid, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../styles/theme';
import ReviewScanScreen from './reviewScanScreen';

interface ScanScreenProps {
  onCancel: () => void;
  onExpenseSaved?: () => void;
  selectedOrgId?: string | null;
  defaultDocumentType?: 'receipt' | 'sales_report';
  onPermissionDenied?: (denied: boolean) => void;
}

export default function ScanScreen({ onCancel, onExpenseSaved, selectedOrgId, defaultDocumentType, onPermissionDenied }: ScanScreenProps) {
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const updatePermissionDenied = (denied: boolean) => {
    setPermissionDenied(denied);
    onPermissionDenied?.(denied);
  };

  useEffect(() => {
    if (!scannedImage) {
      scanDocument();
    }
    return () => { onPermissionDenied?.(false); };
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
          updatePermissionDenied(true);
          return;
        }
      } else {
        const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
        if (existingStatus === 'denied') {
          updatePermissionDenied(true);
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

  if (showReview && scannedImage) {
    return (
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
    );
  }

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color={colors.primary} />
          <Text style={styles.permissionTitle}>Start scanning today</Text>
          <Text style={styles.permissionMessage}>
            Allow Tally to access your camera to scan receipts and sales reports.
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsLink}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isScanning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Opening Scanner...</Text>
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  settingsLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
