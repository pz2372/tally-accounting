// Firebase configuration for Tally mobile app
// Firebase will automatically use GoogleService-Info.plist on iOS
// and google-services.json on Android

import auth from '@react-native-firebase/auth';

// Initialize Firebase Auth
export const firebaseAuth = auth();

// Auth helper functions
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signOut = async () => {
  try {
    await firebaseAuth.signOut();
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getCurrentUser = () => {
  return firebaseAuth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return firebaseAuth.onAuthStateChanged(callback);
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
