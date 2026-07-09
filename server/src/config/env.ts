const requiredAlways = ['JWT_SECRET'];

const requiredProduction = [
  'DATABASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'ANTHROPIC_API_KEY',
  'ALLOWED_ORIGINS',
];

export const validateEnv = () => {
  const missing = requiredAlways.filter(key => !process.env[key]);

  if (process.env.NODE_ENV === 'production') {
    missing.push(...requiredProduction.filter(key => !process.env[key]));
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${Array.from(new Set(missing)).join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
};
