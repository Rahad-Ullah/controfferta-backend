import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import config from '../config';
import s3Client from '../config/aws-s3';

/**
 * Deletes a file from the S3 bucket using either its S3 Key or full public URL.
 *
 * @param fileIdentifier - e.g., "image/my-photo-1710000000000-8f1a2c3d.png"
 *                         OR "https://media.rizipt.com/image/my-photo-1710000000000-8f1a2c3d.png"
 */
const deleteS3File = async (fileIdentifier: string): Promise<void> => {
  if (!fileIdentifier) return;

  try {
    // 1. Extract the S3 Key if a full URL was provided
    // Converts "https://media.rizipt.com/image/photo.png" -> "image/photo.png"
    let s3Key = fileIdentifier;
    if (
      fileIdentifier.startsWith('http://') ||
      fileIdentifier.startsWith('https://')
    ) {
      const url = new URL(fileIdentifier);
      // Remove leading slash from pathname
      s3Key = url.pathname.startsWith('/')
        ? url.pathname.slice(1)
        : url.pathname;
    }

    // 2. Send delete command to S3
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error: any) {
    // Log the error so your application can handle/debug S3 deletion issues
    console.error(
      `Failed to delete S3 object (${fileIdentifier}):`,
      error.message,
    );
  }
};

export default deleteS3File;
