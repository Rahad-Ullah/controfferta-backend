import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { NotificationType } from '../notification/notification.constant';
import { NotificationQueue } from '../notification/notification.queue';
import { UserRole } from '../user/user.constant';
import { DisclaimerType } from './disclaimer.constants';
import { Disclaimer } from './disclaimer.model';

const policyName = (type: DisclaimerType) =>
  type === DisclaimerType.PrivacyPolicy ? 'Privacy Policy' : 'Terms of Service';

// ---------------- create or update disclaimer ----------------
const createOrUpdateDisclaimer = async (payload: {
  type: DisclaimerType;
  content: string;
}) => {
  // one document per type; a later save replaces the content
  const result = await Disclaimer.findOneAndUpdate(
    { type: payload.type },
    payload,
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create or update disclaimer',
    );
  }

  await NotificationQueue.broadcastToAllUsers(
    { role: { $ne: UserRole.SuperAdmin } },
    {
      type: NotificationType.PolicyUpdated,
      title: 'Policy Updated',
      message: `${policyName(payload.type)} has been updated`,
      referenceId: result._id.toString(),
    },
  );

  return result;
};

// ---------------- get disclaimer by type ----------------
const getDisclaimerByType = async (type: DisclaimerType) => {
  const disclaimer = await Disclaimer.findOne({ type });

  if (!disclaimer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Disclaimer not found');
  }

  return disclaimer;
};

export const DisclaimerServices = {
  createOrUpdateDisclaimer,
  getDisclaimerByType,
};
