import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin with service account
export const initializeFirebase = () => {
  if (admin.apps.length > 0) return; // already initialized

  let serviceAccount: admin.ServiceAccount | null = null;

  // Option 1: JSON string in env var (preferred for cloud deployments like Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but contains invalid JSON');
    }
  }

  // Option 2: Path to a service account key file (for local development)
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    try {
      serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch {
      throw new Error(`Failed to read Firebase service account key from: ${resolvedPath}`);
    }
  }

  if (!serviceAccount) {
    throw new Error(
      'Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (cloud) or FIREBASE_SERVICE_ACCOUNT_KEY (local)'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log('✅ Firebase Admin initialized successfully');
};

export const getAuth = () => admin.auth();

export const getFirestore = () => admin.firestore();

export { admin };
