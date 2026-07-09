import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  // expo-local-authentication not available (e.g. Expo Go)
}
import { secureGet, secureSet, secureDelete } from '../utils/secureStorage';
import { signInWithEmail as firebaseSignIn, signOut as firebaseSignOut, getIdToken } from '../config/firebase';
import { cacheLoginData, clearCache } from './cacheService';

// Update this with your server URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';
const REQUEST_TIMEOUT_MS = 15000;

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

const getNetworkErrorMessage = (error: any) => {
  if (error.code === 'ECONNABORTED') {
    return 'Server took too long to respond. Please try again.';
  }

  if (error.message === 'Network Error' || !error.response) {
    return 'Cannot reach the server. Make sure the API server is running and the app URL is correct.';
  }

  return error.response?.data?.message || error.response?.data?.error || 'Failed to authenticate with server';
};

// Store tokens securely
export const storeTokens = async (accessToken: string, refreshToken?: string) => {
  try {
    await secureSet(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await secureSet(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    // Silently fail on token storage
  }
};

export const storeUser = async (user: unknown) => {
  try {
    await AsyncStorage.setItem(`@${USER_KEY}`, JSON.stringify(user));
  } catch (error) {
    // Silently fail on user storage
  }
};

// Get stored access token
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await secureGet(ACCESS_TOKEN_KEY);

    // If no token, try to refresh using Firebase
    if (!token) {
      const refreshed = await refreshAccessToken();
      return refreshed;
    }

    return token;
  } catch (error) {
    return null;
  }
};

// Refresh access token using Firebase ID token
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const { token: firebaseToken, error: tokenError } = await getIdToken();

    if (tokenError || !firebaseToken) {
      return null;
    }

    const { accessToken, refreshToken, error: serverError } = await exchangeFirebaseToken(firebaseToken);

    if (serverError || !accessToken) {
      return null;
    }

    await storeTokens(accessToken, refreshToken);
    return accessToken;
  } catch (error) {
    return null;
  }
};

// Get stored refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await secureGet(REFRESH_TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

// Clear all tokens
export const clearTokens = async () => {
  try {
    await secureDelete(ACCESS_TOKEN_KEY);
    await secureDelete(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(`@${USER_KEY}`);
    await secureDelete(USER_KEY);
    await secureDelete(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    // Silently fail on token clearing
  }
};

export const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(`@${USER_KEY}`) || await secureGet(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

// Exchange Firebase token for server access token
const exchangeFirebaseToken = async (firebaseToken: string) => {
  const startedAt = Date.now();
  console.log(`[auth] POST ${API_URL}/api/auth/firebase-login started`);

  try {
    const response = await axios.post(
      `${API_URL}/api/auth/firebase-login`,
      { firebaseToken },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    console.log(`[auth] POST /api/auth/firebase-login completed in ${Date.now() - startedAt}ms`);

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
      presetCategories: response.data.presetCategories,
      firstOrgData: response.data.firstOrgData,
      syncedAt: response.data.syncedAt,
      syncPeriod: response.data.syncPeriod,
      error: null,
    };
  } catch (error: any) {
    console.log(
      `[auth] POST /api/auth/firebase-login failed in ${Date.now() - startedAt}ms`,
      error.code || error.message
    );

    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      presetCategories: null,
      firstOrgData: null,
      syncedAt: null,
      syncPeriod: null,
      error: getNetworkErrorMessage(error),
    };
  }
};

// Complete login flow: Firebase auth + server token exchange
export const login = async (email: string, password: string) => {
  try {
    // Step 1: Sign in with Firebase
    const { user: firebaseUser, error: firebaseError } = await firebaseSignIn(email, password);

    if (firebaseError || !firebaseUser) {
      return {
        success: false,
        error: firebaseError || 'Firebase authentication failed',
        user: null,
      };
    }

    // Step 2: Get Firebase ID token
    const { token: firebaseToken, error: tokenError } = await getIdToken();

    if (tokenError || !firebaseToken) {
      return {
        success: false,
        error: tokenError || 'Failed to get Firebase token',
        user: null,
      };
    }

    // Step 3: Exchange Firebase token for server access token and get comprehensive data
    const { accessToken, refreshToken, user, presetCategories, firstOrgData, syncedAt, syncPeriod, error: serverError } = await exchangeFirebaseToken(firebaseToken);

    if (serverError || !accessToken) {
      return {
        success: false,
        error: serverError || 'Server authentication failed',
        user: null,
      };
    }

    // Step 4: Store tokens and cache comprehensive data
    await storeTokens(accessToken, refreshToken);
    await storeUser(user);

    await cacheLoginData({
      user,
      presetCategories,
      firstOrgData,
      syncedAt,
      syncPeriod,
    });

    return {
      success: true,
      error: null,
      user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      user: null,
    };
  }
};

// Logout: clear Firebase session, tokens, and cached data
export const logout = async () => {
  try {
    await firebaseSignOut();
    await clearTokens();
    await clearCache();
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Check if user has a valid session by verifying with the server
export const checkAuth = async (): Promise<{ valid: boolean; user: any | null }> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { valid: false, user: null };
  }

  try {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const freshUser = response.data.user ?? response.data;
    // Update stored user with fresh data from server
    if (freshUser) {
      await storeUser(freshUser);
    }
    return { valid: true, user: freshUser };
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token is invalid or expired — clear it
      await clearTokens();
    }
    return { valid: false, user: null };
  }
};

// Create axios instance with auth headers
export const createAuthenticatedAxios = async () => {
  const accessToken = await getAccessToken();

  return axios.create({
    baseURL: API_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

// ---- Biometric helpers ----

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    if (!LocalAuthentication) return false;
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
};

export const getBiometricType = async (): Promise<string> => {
  try {
    if (!LocalAuthentication) return 'Biometrics';
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }
    return 'Biometrics';
  } catch {
    return 'Biometrics';
  }
};

export const authenticateWithBiometric = async (): Promise<boolean> => {
  try {
    if (!LocalAuthentication) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Tally',
      cancelLabel: 'Use Password',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await secureSet(BIOMETRIC_ENABLED_KEY, 'true');
    } else {
      await secureDelete(BIOMETRIC_ENABLED_KEY);
    }
  } catch {
    // Silently fail
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const value = await secureGet(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};
