import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { signInWithEmail as firebaseSignIn, signOut as firebaseSignOut, getIdToken } from '../config/firebase';
import { cacheLoginData, clearCache } from './cacheService';

// Update this with your server URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'current_user';

// Store tokens securely
export const storeTokens = async (accessToken: string, refreshToken?: string) => {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    console.error('Error storing tokens:', error);
  }
};

export const storeUser = async (user: unknown) => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

// Get stored access token
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    // If no token, try to refresh using Firebase
    if (!token) {
      const refreshed = await refreshAccessToken();
      return refreshed;
    }

    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
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
    console.error('Error refreshing access token:', error);
    return null;
  }
};

// Get stored refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

// Clear all tokens
export const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

export const getStoredUser = async () => {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error reading user:', error);
    return null;
  }
};

// Exchange Firebase token for server access token
const exchangeFirebaseToken = async (firebaseToken: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/firebase-login`, {
      firebaseToken,
    });

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
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      presetCategories: null,
      firstOrgData: null,
      syncedAt: null,
      syncPeriod: null,
      error: error.response?.data?.message || 'Failed to authenticate with server',
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
    console.error('Login error:', error);
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
    console.error('Logout error:', error);
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
    });
    return { valid: true, user: response.data.user ?? response.data };
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
