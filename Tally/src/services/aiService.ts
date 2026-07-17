// AI Service for Receipt Data Extraction
import * as FileSystem from 'expo-file-system/legacy';
import { getAccessToken, getStoredUser } from './authService';

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
  creditCard: string;
  takeout: string;
  tips: string;
  tax: string;
  discounts: string;
  refunds: string;
  items: Array<{
    name: string;
    normalizedName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    total: string;
  }>;
}

/**
 * Extract receipt data using AI from an image URI
 * @param imageUri - Local file URI of the scanned receipt
 * @param categories - Optional list of category names for Claude to choose from
 * @returns Extracted receipt data
 */
export const extractReceiptData = async (imageUri: string, categories?: string[], orgIdOverride?: string | null): Promise<ExtractedReceiptData> => {
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

    const storedUser = await getStoredUser();
    const orgId = orgIdOverride || storedUser?.organizations?.[0]?.id;

    // Call backend extraction endpoint
    const response = await fetch(`${API_URL}/api/receipts/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(orgId ? { 'x-org-id': orgId } : {}),
      },
      body: JSON.stringify({
        image: base64Image,
        categories: categories || [],
      }),
    });

    if (!response.ok) {
      let message = 'Failed to extract receipt data';
      try {
        const error = await response.json();
        message = error.error || error.message || message;
      } catch {
        message = `${response.status} ${response.statusText || message}`;
      }
      throw new Error(message);
    }

    const data = await response.json();

    return {
      merchant: data.merchant || '',
      amount: data.amount || '',
      date: data.date ? (() => {
        const parts = String(data.date).split('-').map(Number);
        return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(data.date);
      })() : new Date(),
      category: data.category || '',
      notes: data.notes || '',
      documentType: (data.documentType === 'receipt' || data.documentType === 'sales_report') ? data.documentType : 'receipt',
      grossSales: data.grossSales || '',
      netSales: data.netSales || '',
      cash: data.cash || '',
      creditCard: data.creditCard || '',
      takeout: data.takeout || '',
      tips: data.tips || '',
      tax: data.tax || '',
      discounts: data.discounts || '',
      refunds: data.refunds || '',
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        name: item.name || '',
        normalizedName: item.normalizedName || item.name || '',
        quantity: item.quantity || '',
        unit: item.unit || '',
        unitPrice: item.unitPrice || '',
        total: item.total || '',
      })) : [],
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to extract receipt data');
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
