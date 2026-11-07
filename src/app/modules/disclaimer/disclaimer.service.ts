import { Disclaimer } from './disclaimer.model';
import { DisclaimerType } from './disclaimer.constants';
import { IDisclaimer } from './disclaimer.interface';
import { NotificationQueue } from '../notification/notification.queue';
import { NotificationType } from '../notification/notification.constant';
import { UserRole } from '../user/user.constant';

// -------------- create/update disclaimer ----------------
const createOrUpdateDisclaimer = async (
  payload: IDisclaimer,
): Promise<IDisclaimer> => {
  const result = await Disclaimer.findOneAndUpdate(
    { type: payload.type },
    payload,
    { upsert: true, new: true },
  );

  if (!result) {
    throw new Error('Failed to create or update disclaimer');
  }

  // broadcast notification to all users
  if (
    payload.type === DisclaimerType.PrivacyPolicy ||
    payload.type === DisclaimerType.TermsOfService
  ) {
    await NotificationQueue.broadcastToAllUsers(
      { role: { $ne: UserRole.SuperAdmin } },
      {
        type: NotificationType.PolicyUpdated,
        title: 'Policy Updated',
        message: `${payload.type === DisclaimerType.PrivacyPolicy ? 'Privacy Policy' : 'Terms of Service'} has been updated`,
        referenceId: result._id.toString(),
      },
    );
  }

  return result;
};

// -------------- get disclaimer by type ----------------
const getDisclaimerByType = async (
  type: DisclaimerType,
): Promise<IDisclaimer | null> => {
  return await Disclaimer.findOne({ type });
};

export const DisclaimerServices = {
  createOrUpdateDisclaimer,
  getDisclaimerByType,
};
