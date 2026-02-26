import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_CONFIG } from '../config/s3';
import { randomUUID } from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Upload a file to S3
 * @param file - The file buffer to upload
 * @param fileName - Original file name
 * @param mimeType - MIME type of the file
 * @param folder - Optional folder prefix (e.g., 'receipts', 'sales-reports')
 * @returns Upload result with key and URL
 */
export async function uploadToS3(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  // Validate file type
  if (!S3_CONFIG.allowedMimeTypes.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }

  // Validate file size
  if (file.length > S3_CONFIG.maxFileSize) {
    throw new Error(`File size exceeds maximum allowed size of ${S3_CONFIG.maxFileSize} bytes`);
  }

  // Generate unique key
  const fileExtension = fileName.split('.').pop();
  const key = `${folder}/${randomUUID()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.bucketName,
    Key: key,
    Body: file,
    ContentType: mimeType,
    // Make files publicly readable (optional - remove if you want private files)
    // ACL: 'public-read',
  });

  try {
    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;

    return {
      key,
      url,
      bucket: S3_CONFIG.bucketName,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete a file from S3
 * @param key - The S3 key of the file to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_CONFIG.bucketName,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Generate a presigned URL for private file access
 * @param key - The S3 key of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Get an S3 object stream
 * @param key - The S3 key of the file
 * @returns GetObject response with Body stream and ContentType
 */
export async function getS3Object(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.bucketName,
    Key: key,
  });

  return s3Client.send(command);
}

/**
 * Extract S3 key from full URL
 * @param url - Full S3 URL
 * @returns S3 key or null if invalid
 */
export function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts.slice(1).join('/'); // Remove leading slash
  } catch {
    return null;
  }
}
