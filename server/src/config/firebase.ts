import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin with service account
export const initializeFirebase = () => {
  try {
    // Check if service account key path is provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string;
      const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
      const serviceAccount = require(resolvedPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.warn('⚠️  Firebase service account key not configured');
      console.warn('Set FIREBASE_SERVICE_ACCOUNT_KEY in .env file');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
  }
};

export const getAuth = () => admin.auth();

export const getFirestore = () => admin.firestore();

export { admin };
