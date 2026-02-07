const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const initializeFirebase = () => {
  try {
    // Check if service account key path is provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
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

const getAuth = () => {
  return admin.auth();
};

const getFirestore = () => {
  return admin.firestore();
};

module.exports = {
  initializeFirebase,
  getAuth,
  getFirestore,
  admin
};
