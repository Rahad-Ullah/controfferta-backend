import { redis } from '../../../config/redis';
import deleteS3File from '../../../shared/deleteS3File';

const MEDIA_ZSET_KEY = 'unlinked_media_uploads';

// -------------- Upload Media --------------
const uploadMedia = async (urls: string[]): Promise<string[]> => {
  if (!urls || urls.length === 0) return [];

  const pipeline = redis.pipeline();
  const currentTimestamp = Date.now();

  urls.forEach(url => {
    // Add URL to Sorted Set using the timestamp as the score
    pipeline.zadd(MEDIA_ZSET_KEY, currentTimestamp, url);
  });

  await pipeline.exec();
  return urls;
};

// -------------- Mark as Used --------------
const markMediaAsUsed = async (urls: string | string[]): Promise<void> => {
  const urlArray = Array.isArray(urls) ? urls : [urls];

  if (urlArray.length === 0) return;

  await redis.zrem(MEDIA_ZSET_KEY, ...urlArray);
};

// -------------- Cleanup Junk Media --------------
const deleteJunkMediaFiles = async (): Promise<void> => {
  const twentyFourHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

  // Fetch all media uploaded BEFORE 6 hours ago using score range (-inf to 6h ago)
  const expiredUrls = await redis.zrangebyscore(
    MEDIA_ZSET_KEY,
    '-inf',
    twentyFourHoursAgo,
  );

  if (!expiredUrls.length) return;

  for (const url of expiredUrls) {
    try {
      await deleteS3File(url);
      await redis.zrem(MEDIA_ZSET_KEY, url); // Remove from Redis set
    } catch (error) {
      console.error(`[Redis Media Cleanup Error] URL: ${url}`, error);
    }
  }
};

export const MediaUploadServices = {
  uploadMedia,
  markMediaAsUsed,
  deleteJunkMediaFiles,
};
