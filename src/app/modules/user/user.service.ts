import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { EmailQueue } from '../../../helpers/email.queue';
import { emailTemplate } from '../../../shared/emailTemplate';
import deleteS3File from '../../../shared/deleteS3File';
import generateOTP from '../../../utils/generateOTP';
import { hashOtp, OTP_TTL_MS } from '../../../utils/otp';
import { IProviderProfileUpdate, IRegisterUser, IUser } from './user.interface';
import { User } from './user.model';
import { UserRole, UserStatus } from './user.constant';
import QueryBuilder from '../../builder/QueryBuilder';
import mongoose from 'mongoose';
import { sendNotifications } from '../../../helpers/notificationHelper';
import { NotificationType } from '../notification/notification.constant';
import { MediaUploadServices } from '../mediaUpload/mediaUpload.service';
import { Provider } from '../provider/provider.model';
import { CreditLedgerServices } from '../creditLedger/creditLedger.service';
import { errorLogger } from '../../../shared/logger';

const createUserToDB = async (payload: IRegisterUser) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const isExistUser = await User.exists({ email: payload.email }).session(
      session,
    );
    if (isExistUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists!');
    }

    const [createdUser] = await User.create(
      [
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          phone: payload.phone,
        },
      ],
      { session },
    );
    if (!createdUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
    }

    if (payload.role === UserRole.Provider) {
      const [provider] = await Provider.create(
        [
          {
            user: createdUser._id,
            businessName: payload.businessName,
            businessType: payload.businessType,
            bio: payload.bio,
            interestedCategories: payload.interestedCategories,
          },
        ],
        { session },
      );
      if (!provider) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to create provider profile',
        );
      }

      await User.updateOne(
        { _id: createdUser._id },
        { $set: { roleRef: provider._id } },
        { session },
      );

      await CreditLedgerServices.grantWelcomeCredits(
        provider._id.toString(),
        session,
      );
    }

    const otp = generateOTP(6);
    await User.updateOne(
      { _id: createdUser._id },
      {
        $set: {
          authentication: {
            oneTimeCode: hashOtp(otp),
            expireAt: new Date(Date.now() + OTP_TTL_MS),
          },
        },
      },
      { session },
    );

    await session.commitTransaction();

    const verificationEmail = emailTemplate.createAccount({
      otp,
      email: createdUser.email,
    });
    // The account is already saved. Login sends a fresh code if this job is lost.
    EmailQueue.enqueueEmail(verificationEmail).catch(error =>
      errorLogger.error('Failed to queue verification email', error),
    );

    return {
      message: 'Account created successfully. Please verify your email.',
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const getSingleUserFromDB = async (id: string) => {
  const result = await User.findById(id).populate('roleRef');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return result;
};

const getProfileFromDB = async (id: string): Promise<Partial<IUser>> => {
  const user = await User.findById(id).populate('roleRef');
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // check if user is deleted
  if (user.isDeleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'It looks like your account has been deleted or deactivated.',
    );
  }

  //check user status
  if (user.status !== UserStatus.Active) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'It looks like your account has been suspended or deactivated.',
    );
  }

  return user;
};

const providerFieldsOf = (
  payload: IProviderProfileUpdate,
): IProviderProfileUpdate => {
  const update: IProviderProfileUpdate = {};
  if (payload.businessName !== undefined) {
    update.businessName = payload.businessName;
  }
  if (payload.businessType !== undefined) {
    update.businessType = payload.businessType;
  }
  if (payload.bio !== undefined) update.bio = payload.bio;
  if (payload.interestedCategories !== undefined) {
    update.interestedCategories = payload.interestedCategories;
  }
  return update;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser> & IProviderProfileUpdate,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const {
    businessName,
    businessType,
    bio,
    interestedCategories,
    ...userPayload
  } = payload;
  const providerUpdate = providerFieldsOf({
    businessName,
    businessType,
    bio,
    interestedCategories,
  });
  const hasProviderUpdate = Object.keys(providerUpdate).length > 0;

  const existingUser = await User.findById(id).select('_id image role');
  if (!existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (hasProviderUpdate && existingUser.role !== UserRole.Provider) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only a provider can update a company profile',
    );
  }

  if (hasProviderUpdate) {
    const provider = await Provider.findOneAndUpdate(
      { user: id },
      { $set: providerUpdate },
      { new: true },
    );
    if (!provider) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
    }
  }

  const result = await User.findByIdAndUpdate(id, userPayload, {
    new: true,
  }).populate('roleRef');

  // mark the new file as used
  if (userPayload.image) {
    await MediaUploadServices.markMediaAsUsed(userPayload.image);
  }

  // unlink old file from s3
  if (
    userPayload.image &&
    existingUser.image &&
    userPayload.image !== existingUser.image
  ) {
    deleteS3File(existingUser.image).catch(err => console.error(err));
  }

  return result;
};

const assertCallerCanManageUser = (
  caller: JwtPayload,
  targetRole: UserRole,
) => {
  if (targetRole === UserRole.SuperAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot change a super admin',
    );
  }

  if (targetRole === UserRole.Admin && caller.role !== UserRole.SuperAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only a super admin can change an admin',
    );
  }
};

// ------------ update user status ------------
const updateStatusToDB = async (
  id: string,
  payload: { status: UserStatus },
  caller: JwtPayload,
): Promise<Partial<IUser | null>> => {
  const existingUser = await User.findById(id);
  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  assertCallerCanManageUser(caller, existingUser.role);

  const result = await User.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  // send notification to user
  sendNotifications({
    type: NotificationType.AccountUpdated,
    receiver: result?._id,
    title: 'Account Status Updated',
    message: `Your account has been ${payload.status.toLowerCase()}`,
    referenceId: result?._id.toString(),
  }).catch(err => console.error(err));

  return result;
};

// ------------ delete user ------------
const deleteSingleUserFromDB = async (
  userId: string,
  caller: JwtPayload,
): Promise<Partial<IUser>> => {
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  assertCallerCanManageUser(caller, existingUser.role);

  const result = await User.findByIdAndUpdate(
    userId,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  return result;
};

// ------------ get all users ------------
const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(
    User.find({ isDeleted: false, role: { $ne: UserRole.SuperAdmin } }),
    query,
  )
    .search(['firstName', 'lastName', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    userQuery.modelQuery.populate('roleRef').lean(),
    userQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const UserService = {
  createUserToDB,
  getSingleUserFromDB,
  getProfileFromDB,
  updateProfileToDB,
  updateStatusToDB,
  deleteSingleUserFromDB,
  getAllUsersFromDB,
};
