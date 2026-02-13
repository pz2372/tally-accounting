// AI Service for Receipt Data Extraction
// import * as FileSystem from 'expo-file-system';
import { getAccessToken } from './authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface ExtractedReceiptData {
  merchant: string;
  amount: string;
  date: Date;
  category: string;
  notes: string;
}

/**
 * Extract receipt data using AI from an image URI
 * @param imageUri - Local file URI of the scanned receipt
 * @returns Extracted receipt data
 */
export const extractReceiptData = async (imageUri: string): Promise<ExtractedReceiptData> => {
  try {
    // TODO: Implement actual AI extraction endpoint on backend
    // For now, return mock data after a delay to simulate processing
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock extracted data
    return {
      merchant: 'Sample Merchant',
      amount: '0.00',
      date: new Date(),
      category: 'Select Category',
      notes: '',
    };

    /* 
    // Future implementation with actual backend endpoint:
    // Uncomment and install expo-file-system when implementing
    
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const token = await getAccessToken();
    
    const response = await fetch(`${API_URL}/api/receipts/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract receipt data');
    }

    const data = await response.json();

    return {
      merchant: data.merchant || '',
      amount: data.amount || '',
      date: data.date ? new Date(data.date) : new Date(),
      category: data.category || 'Select Category',
      notes: data.notes || '',
    };
    */
  } catch (error) {
    console.error('Error extracting receipt data:', error);
    // Return empty data on error so user can enter manually
    return {
      merchant: '',
      amount: '',
      date: new Date(),
      category: 'Select Category',
      notes: '',
    };
  }
};

/**
 * Upload receipt image to server and get presigned URL
 * @param imageUri - Local file URI of the receipt
 * @returns Server URL of the uploaded image
 */
export const uploadReceiptImage = async (imageUri: string): Promise<string> => {
  try {
    const token = await getAccessToken();
    
    // Create form data
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // @ts-ignore - FormData append accepts files in React Native
    formData.append('receipt', {
      uri: imageUri,
      name: filename,
      type,
    });

    const response = await fetch(`${API_URL}/api/receipts/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload receipt image');
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};
