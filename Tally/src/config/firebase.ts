// Firebase configuration for Tally mobile app
// Using Firebase Auth REST API for React Native compatibility

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet, secureSet, secureDelete } from '../utils/secureStorage';

const FIREBASE_API_KEY = 'AIzaSyDUAfgY-vHfcjvxeJo2DHVfE8pMbQhe1pk';
const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_REFRESH_URL = 'https://securetoken.googleapis.com/v1';

const FIREBASE_USER_KEY = 'firebase_user';
const FIREBASE_ID_TOKEN_KEY = 'firebase_id_token';
const FIREBASE_REFRESH_TOKEN_KEY = 'firebase_refresh_token';

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  idToken: string;
  refreshToken: string;
};

let currentUser: User | null = null;

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

// Load persisted user on startup
const loadPersistedUser = async () => {
  try {
    const [rawProfile, idToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(`@${FIREBASE_USER_KEY}`),
      secureGet(FIREBASE_ID_TOKEN_KEY),
      secureGet(FIREBASE_REFRESH_TOKEN_KEY),
    ]);

    if (rawProfile && idToken && refreshToken) {
      currentUser = { ...JSON.parse(rawProfile), idToken, refreshToken };
      return;
    }

    const legacyRaw = await secureGet(FIREBASE_USER_KEY);
    if (legacyRaw) {
      currentUser = JSON.parse(legacyRaw);
      await persistUser(currentUser);
      await secureDelete(FIREBASE_USER_KEY);
    }
  } catch (error) {
    // Failed to load persisted user
  }
};
loadPersistedUser();

const persistUser = async (user: User | null) => {
  try {
    if (user) {
      const { idToken, refreshToken, ...profile } = user;
      await Promise.all([
        AsyncStorage.setItem(`@${FIREBASE_USER_KEY}`, JSON.stringify(profile)),
        secureSet(FIREBASE_ID_TOKEN_KEY, idToken),
        secureSet(FIREBASE_REFRESH_TOKEN_KEY, refreshToken),
        secureDelete(FIREBASE_USER_KEY),
      ]);
    } else {
      await Promise.all([
        AsyncStorage.removeItem(`@${FIREBASE_USER_KEY}`),
        secureDelete(FIREBASE_ID_TOKEN_KEY),
        secureDelete(FIREBASE_REFRESH_TOKEN_KEY),
        secureDelete(FIREBASE_USER_KEY),
      ]);
    }
  } catch (error) {
    // Failed to persist user
  }
};

// Sign in with email/password via REST API
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const response = await fetchWithTimeout(
      `${AUTH_BASE_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Authentication failed';
      return { user: null, error: errorMessage };
    }

    const user: User = {
      uid: data.localId,
      email: data.email,
      displayName: data.displayName || null,
      photoURL: data.profilePicture || null,
      emailVerified: data.emailVerified || false,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };

    currentUser = user;
    await persistUser(user);

    return { user, error: null };
  } catch (error: any) {
    return {
      user: null,
      error: error.name === 'AbortError'
        ? 'Firebase took too long to respond. Please try again.'
        : error.message || 'Firebase authentication failed'
    };
  }
};

// Sign up with email/password via REST API
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const response = await fetchWithTimeout(
      `${AUTH_BASE_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error?.message || 'Registration failed' };
    }

    const user: User = {
      uid: data.localId,
      email: data.email,
      displayName: null,
      photoURL: null,
      emailVerified: false,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };

    currentUser = user;
    await persistUser(user);

    return { user, error: null };
  } catch (error: any) {
    return {
      user: null,
      error: error.name === 'AbortError'
        ? 'Firebase took too long to respond. Please try again.'
        : error.message
    };
  }
};

// Sign out
export const signOut = async () => {
  try {
    currentUser = null;
    await persistUser(null);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getCurrentUser = () => currentUser;

// Listen to auth state changes (simplified - checks persisted state)
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  // Call immediately with current state
  loadPersistedUser().then(() => callback(currentUser));
  // Return unsubscribe function
  return () => {};
};

// Get ID token, refreshing if needed
export const getIdToken = async () => {
  if (!currentUser) {
    return { token: null, error: 'No user logged in' };
  }

  // Try to refresh the token
  try {
    const response = await fetchWithTimeout(
      `${TOKEN_REFRESH_URL}/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: currentUser.refreshToken,
        }),
      },
    );

    const data = await response.json();

    if (response.ok) {
      currentUser = {
        ...currentUser,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
      };
      await persistUser(currentUser);
      return { token: data.id_token, error: null };
    }

    // If refresh fails, return existing token
    return { token: currentUser.idToken, error: null };
  } catch (error: any) {
    // If refresh fails, return existing token
    return { token: currentUser.idToken, error: null };
  }
};
