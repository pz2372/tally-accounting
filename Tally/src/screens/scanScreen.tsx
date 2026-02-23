import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentScanner from 'react-native-document-scanner-plugin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../styles/theme';
import ReviewScanScreen from './reviewScanScreen';
import { getAccessToken } from '../services/authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Payment method mapping for API
const PAYMENT_METHOD_MAP: Record<string, string> = {
  'Credit Card': 'CREDIT_CARD',
  'Debit Card': 'DEBIT_CARD',
  'Cash': 'CASH',
};

interface ScanScreenProps {
  onCancel: () => void;
  onSave?: (imageUri: string) => void;
  showReviewScreen?: boolean;
  onExpenseSaved?: () => void;
  selectedOrgId?: string | null;
}

export default function ScanScreen({ onCancel, onSave: _onSave, showReviewScreen: _showReviewScreen = false, onExpenseSaved, selectedOrgId }: ScanScreenProps) {
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Open scanner automatically when screen is opened
    if (!scannedImage) {
      scanDocument();
    }
  }, []);

  const scanDocument = async () => {
    try {
      setIsScanning(true);

      // Request camera permission on Android if needed
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
      }

      const { scannedImages, status } = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
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
      console.log('Scanner cancelled or error:', error);
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

  const handleExpenseSave = async (data: {
    merchant: string;
    amount: string;
    category: string;
    paymentMethod: string;
    date: Date;
    notes: string;
    imageUri: string;
  }) => {
    setIsSaving(true);
    try {
      // Get auth token and org ID
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setIsSaving(false);
        return;
      }

      const userRaw = await AsyncStorage.getItem('@current_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const orgId = selectedOrgId || user?.organizations?.[0]?.id;
      if (!orgId) {
        Alert.alert('Error', 'No organization found. Please log in again.');
        setIsSaving(false);
        return;
      }

      // Prepare expense data
      const amountCents = Math.round(parseFloat(data.amount) * 100);
      const paymentMethodApi = PAYMENT_METHOD_MAP[data.paymentMethod] || 'CREDIT_CARD';

      // Create FormData with receipt
      const formData = new FormData();
      const filename = data.imageUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('receipt', {
        uri: data.imageUri,
        type,
        name: filename,
      } as any);
      formData.append('amountCents', String(amountCents));
      formData.append('paymentMethod', paymentMethodApi);
      formData.append('expenseDate', data.date.toISOString());
      formData.append('categoryName', data.category);
      if (data.merchant.trim()) formData.append('merchant', data.merchant.trim());
      if (data.notes.trim()) formData.append('notes', data.notes.trim());

      // Send to backend
      const response = await fetch(`${API_URL}/api/expenses/with-receipt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-org-id': orgId,
        },
        body: formData,
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save expense');
      }

      // Update local cache
      const savedExpense = responseData.expense;
      if (savedExpense) {
        const cacheKey = `@org_expenses_${orgId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        const cachedList = cached ? JSON.parse(cached) : [];
        await AsyncStorage.setItem(cacheKey, JSON.stringify([savedExpense, ...cachedList]));
      }

      Alert.alert(
        'Success',
        'Expense saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowReview(false);
              setScannedImage(null);
              setIsSaving(false);
              if (onExpenseSaved) {
                onExpenseSaved();
              } else {
                onCancel();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving expense:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to save expense. Please try again.',
        [{ text: 'OK', onPress: () => setIsSaving(false) }]
      );
    }
  };

  return (
    <>
      {showReview && scannedImage ? (
        <ReviewScanScreen
          imageUri={scannedImage}
          onBack={handleReviewBack}
          onSave={handleExpenseSave}
          isSaving={isSaving}
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
