// Firebase configuration for Tally mobile app
// Using Firebase JS SDK (web) for Expo Go compatibility

import { initializeApp } from 'firebase/app';
import { 
  getReactNativePersistence,
  initializeAuth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config from GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyDUAfgY-vHfcjvxeJo2DHVfE8pMbQhe1pk",
  authDomain: "tally-81bd5.firebaseapp.com",
  projectId: "tally-81bd5",
  storageBucket: "tally-81bd5.firebasestorage.app",
  messagingSenderId: "720402260367",
  appId: "1:720402260367:ios:b11a5d19dc6efd55952bfa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const firebaseAuth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Auth helper functions
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(firebaseAuth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getCurrentUser = () => {
  return firebaseAuth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(firebaseAuth, callback);
};

// Get ID token for API calls
export const getIdToken = async () => {
  const user = firebaseAuth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      return { token, error: null };
    } catch (error: any) {
      return { token: null, error: error.message };
    }
  }
  return { token: null, error: 'No user logged in' };
};

export default firebaseAuth;
