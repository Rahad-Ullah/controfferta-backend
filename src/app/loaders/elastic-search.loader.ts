import { logger } from '../../shared/logger';

export const initElasticSearchIndices = async () => {
  try {
    // await setupCouponElasticIndex();
    logger.info('✅ Elastic search indices setup successfully');
  } catch (error) {
    console.error('❌ Error setting up elastic search indices: ', error);
  }
};
