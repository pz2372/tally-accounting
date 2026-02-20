/**
 * Secure storage abstraction.
 * Uses expo-secure-store (iOS Keychain / Android Keystore) in production builds.
 * Falls back to AsyncStorage in Expo Go during development where the native
 * module is unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: typeof import('expo-secure-store') | null = null;

try {
  SecureStore = require('expo-secure-store');
  // Verify the native module is actually available
  SecureStore.getItemAsync('__probe__').catch(() => {});
} catch {
  SecureStore = null;
}

export const secureGet = async (key: string): Promise<string | null> => {
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
};

export const secureSet = async (key: string, value: string): Promise<void> => {
  if (SecureStore) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
};

export const secureDelete = async (key: string): Promise<void> => {
  if (SecureStore) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
};
