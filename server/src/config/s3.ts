import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Configure S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_BUCKET_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export const S3_CONFIG = {
  bucketName: process.env.S3_BUCKET_NAME || 'tally-receipts',
  region: process.env.S3_BUCKET_REGION || 'us-east-1',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ],
};

export default s3Client;
