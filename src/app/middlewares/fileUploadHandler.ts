import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiError';
import config from '../../config';
import s3Client from '../../config/aws-s3';
import crypto from 'crypto';

/**
 * Helper function to upload a single file buffer to AWS S3
 */
const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string,
): Promise<string> => {
  const fileExt = path.extname(file.originalname);

  // Clean up special characters and spaces for URL safety
  const cleanName = file.originalname
    .replace(fileExt, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');

  // Combine timestamp + 8 random hex characters
  const uniqueId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Result: image/my-photo-1710000000000-a4f2c9e1.png
  const s3Key = `${folder}/${cleanName}-${uniqueId}${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  // Return the Cloudflare Custom Domain URL
  return `${config.media_server_url}/${s3Key}`;
};

const fileUploadHandler = (): RequestHandler => {
  // 2. Use Memory Storage instead of Disk Storage
  const storage = multer.memoryStorage();

  // 3. Defined allowed MIME types as Sets for faster and cleaner lookups
  const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ]);

  const ALLOWED_MEDIA_TYPES = new Set(['video/mp4', 'audio/mpeg']);

  const ALLOWED_DOC_TYPES = new Set(['application/pdf']);

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    switch (file.fieldname) {
      case 'image':
        if (ALLOWED_IMAGE_TYPES.has(file.mimetype.toLowerCase())) {
          return cb(null, true);
        }
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .jpeg, .png, .jpg, .heic, and .heics files are supported!',
          ),
        );

      case 'media':
        if (ALLOWED_MEDIA_TYPES.has(file.mimetype.toLowerCase())) {
          return cb(null, true);
        }
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .mp4 and .mp3 files are supported!',
          ),
        );

      case 'doc':
        if (ALLOWED_DOC_TYPES.has(file.mimetype.toLowerCase())) {
          return cb(null, true);
        }
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            'Only .pdf files are supported!',
          ),
        );

      default:
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `The field '${file.fieldname}' is not a recognized file upload field!`,
          ),
        );
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter as any,
    limits: {
      fileSize: 10 * 1024 * 1024, // Optional: set max individual file size limit (e.g., 10MB)
    },
  }).fields([
    { name: 'image', maxCount: 10 },
    { name: 'media', maxCount: 3 },
    { name: 'doc', maxCount: 3 },
  ]);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req as any, res as any, async err => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(
              new ApiError(
                StatusCodes.BAD_REQUEST,
                `File limit exceeded or invalid field name for '${err.field}'.`,
              ),
            );
          }
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ApiError(StatusCodes.BAD_REQUEST, `File size is too large.`),
            );
          }
          return next(
            new ApiError(
              StatusCodes.BAD_REQUEST,
              `Upload error (${err.code}): ${err.message}`,
            ),
          );
        }

        if (err instanceof ApiError) {
          return next(err);
        }

        return next(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            err.message || 'File upload failed',
          ),
        );
      }

      // 4. Upload Memory Buffers to AWS S3 & attach URLs to request
      try {
        const filesMap = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (filesMap) {
          const uploadPromises: Promise<void>[] = [];

          for (const fieldname in filesMap) {
            const files = filesMap[fieldname];

            files.forEach(file => {
              const promise = uploadToS3(file, fieldname).then(s3Url => {
                // Attach location/path to the file object for controller access
                (file as any).location = s3Url;
                (file as any).path = s3Url;
              });
              uploadPromises.push(promise);
            });
          }

          await Promise.all(uploadPromises);
        }
      } catch (s3Err: any) {
        return next(
          new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `S3 Upload failed: ${s3Err.message}`,
          ),
        );
      }

      // 5. Auto-parsing logic for Body (Zod validation)
      if (req.body) {
        const stringBlacklist = [
          'postalcode',
          'zipcode',
          'countrycode',
          'phone',
          'phonenumber',
          'number',
          'id',
        ];

        const deepParse = (obj: any, currentKey: string = ''): any => {
          if (typeof obj === 'string') {
            const trimmedValue = obj.trim();
            const lowerKey = currentKey.toLowerCase();

            try {
              if (
                (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) ||
                (trimmedValue.startsWith('{') && trimmedValue.endsWith('}'))
              ) {
                return deepParse(JSON.parse(trimmedValue), currentKey);
              }

              if (trimmedValue === 'true' || trimmedValue === 'false') {
                return JSON.parse(trimmedValue);
              }

              if (trimmedValue !== '' && !isNaN(Number(trimmedValue))) {
                if (
                  stringBlacklist.some(blacklisted =>
                    lowerKey.includes(blacklisted),
                  )
                ) {
                  return trimmedValue;
                }

                if (
                  trimmedValue.length > 1 &&
                  trimmedValue.startsWith('0') &&
                  !trimmedValue.startsWith('0.')
                ) {
                  return trimmedValue;
                }

                return Number(trimmedValue);
              }
            } catch (e) {
              return obj;
            }
            return trimmedValue;
          }

          if (Array.isArray(obj)) {
            return obj.map(item => deepParse(item, currentKey));
          }

          if (obj !== null && typeof obj === 'object') {
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = deepParse(obj[key], key);
              }
            }
            return obj;
          }

          return obj;
        };

        req.body = deepParse(req.body);
      }

      next();
    });
  };
};

export default fileUploadHandler;
