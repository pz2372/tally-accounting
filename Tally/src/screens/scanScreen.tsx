import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../styles/theme';
import ReviewScanScreen from './reviewScanScreen';

interface ScanScreenProps {
  onCancel: () => void;
  onSave?: (imageUri: string) => void;
  showReviewScreen?: boolean;
  onExpenseSaved?: () => void;
}

export default function ScanScreen({ onCancel, onSave: _onSave, showReviewScreen: _showReviewScreen = false, onExpenseSaved }: ScanScreenProps) {
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
      
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        onCancel();
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setScannedImage(result.assets[0].uri);
        setShowReview(true);
      } else {
        // User cancelled - go back to previous tab
        onCancel();
      }
    } catch (error) {
      console.log('Camera cancelled or error:', error);
      // User cancelled - go back to previous tab
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
    try {
      // TODO: Implement actual save to backend
      // 1. Upload receipt image
      // 2. Get category ID from category name
      // 3. Create expense with receipt ID
      
      console.log('Saving expense:', data);
      
      // For now, just show success and navigate back
      Alert.alert(
        'Success',
        'Expense saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowReview(false);
              setScannedImage(null);
              if (onExpenseSaved) {
                onExpenseSaved();
              } else {
                onCancel();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert(
        'Error',
        'Failed to save expense. Please try again.',
        [{ text: 'OK' }]
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
        />
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          {isScanning && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Opening Camera...</Text>
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
