// AI Service for Receipt Data Extraction
import * as FileSystem from 'expo-file-system/legacy';
import { getAccessToken } from './authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

export interface ExtractedReceiptData {
  merchant: string;
  amount: string;
  date: Date;
  category: string;
  notes: string;
  documentType: 'receipt' | 'sales_report';
  // Sales report specific fields
  grossSales: string;
  netSales: string;
  cash: string;
  tips: string;
  tax: string;
  discounts: string;
  refunds: string;
}

/**
 * Extract receipt data using AI from an image URI
 * @param imageUri - Local file URI of the scanned receipt
 * @param categories - Optional list of category names for Claude to choose from
 * @returns Extracted receipt data
 */
export const extractReceiptData = async (imageUri: string, categories?: string[]): Promise<ExtractedReceiptData> => {
  try {
    // Ensure URI has file:// prefix if needed
    let fileUri = imageUri;
    if (!fileUri.startsWith('file://')) {
      fileUri = `file://${fileUri}`;
    }

    // Read image as base64
    const base64Image = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64Image) {
      throw new Error('Failed to read image file');
    }

    // Get auth token
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Call backend extraction endpoint
    const response = await fetch(`${API_URL}/api/receipts/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        image: base64Image,
        categories: categories || [],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract receipt data');
    }

    const data = await response.json();

    return {
      merchant: data.merchant || '',
      amount: data.amount || '',
      date: data.date ? new Date(data.date) : new Date(),
      category: data.category || '',
      notes: data.notes || '',
      documentType: (data.documentType === 'receipt' || data.documentType === 'sales_report') ? data.documentType : 'receipt',
      grossSales: data.grossSales || '',
      netSales: data.netSales || '',
      cash: data.cash || '',
      tips: data.tips || '',
      tax: data.tax || '',
      discounts: data.discounts || '',
      refunds: data.refunds || '',
    };
  } catch (error: any) {
    // Return empty data on error so user can enter manually
    return {
      merchant: '',
      amount: '',
      date: new Date(),
      category: '',
      notes: '',
      documentType: 'receipt',
      grossSales: '',
      netSales: '',
      cash: '',
      tips: '',
      tax: '',
      discounts: '',
      refunds: '',
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
    throw error;
  }
};
