import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { EmailQueue } from '../../../helpers/email.queue';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
import cryptoToken from '../../../utils/cryptoToken';
import generateOTP from '../../../utils/generateOTP';
import {
  clearOtpAttempts,
  getOtpAttempts,
  hashOtp,
  otpMatches,
} from '../../../utils/otp';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { UserStatus } from '../user/user.constant';
import {
  LOCKED_OTP_MESSAGE,
  OTP_ATTEMPT_LIMIT,
  OTP_TTL_MS,
} from './auth.constant';
import { AuthHelper } from './auth.helper';
import { SessionClient } from './auth.interface';
import { AuthSession } from './auth.session';

//------------------ login ------------------
const loginUserFromDB = async (payload: ILoginData, client: SessionClient) => {
  const { email, password } = payload;
  const isExistUser = await User.findOne({ email }).select('+password');
  if (!isExistUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      config.node_env === 'development'
        ? "User doesn't exist!"
        : 'Invalid email or password',
    );
  }

  // check if user is deleted
  if (isExistUser.isDeleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'It looks like your account has been deleted or deactivated.',
    );
  }

  //check user status
  if (isExistUser.status !== UserStatus.Active) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'It looks like your account has been suspended or deactivated.',
    );
  }

  //check match password
  if (!(await User.isMatchPassword(password, isExistUser.password))) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      config.node_env === 'development'
        ? 'Password is incorrect!'
        : 'Invalid email or password',
    );
  }

  //check if user email is verified
  if (!isExistUser.isEmailVerified) {
    await forgetPasswordToDB(email);
    throw new ApiError(
      StatusCodes.PROXY_AUTHENTICATION_REQUIRED,
      'Please verify your account, then try to login again',
    );
  }

  return AuthHelper.issueSessionTokens(isExistUser, client);
};

// ------------------- forget password -------------------
const forgetPasswordToDB = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (
    !isExistUser ||
    isExistUser.isDeleted ||
    isExistUser.status !== UserStatus.Active
  ) {
    return;
  }

  //send mail
  const otp = generateOTP(6);
  const value = {
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.resetPassword(value);
  await EmailQueue.enqueueEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: hashOtp(otp),
    expireAt: new Date(Date.now() + OTP_TTL_MS),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
  await clearOtpAttempts(isExistUser._id.toString());
};

// ------------------- verify email -------------------
const verifyEmailToDB = async (
  payload: IVerifyEmail,
  client: SessionClient,
) => {
  const { email, oneTimeCode } = payload;
  if (!oneTimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide the OTP, check your email we sent a code',
    );
  }

  const existingUser = await User.findOne({ email }).select('+authentication');
  if (!existingUser) {
    otpMatches(oneTimeCode, hashOtp(0));
    return AuthHelper.failOtpAttempt(`email:${email.trim().toLowerCase()}`);
  }

  // check otp attempts limit
  const authentication = existingUser.authentication;
  const userId = existingUser._id.toString();
  const attempts = await getOtpAttempts(userId);
  if (attempts >= OTP_ATTEMPT_LIMIT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, LOCKED_OTP_MESSAGE);
  }

  // check otp matches
  // if not matches -> record wrong otp attempt and throw error if limit reached
  const storedCode = authentication?.oneTimeCode;
  const codeMatches =
    typeof storedCode === 'string' && otpMatches(oneTimeCode, storedCode);

  if (!codeMatches) {
    const attempts = await getOtpAttempts(userId);
    if (attempts + 1 >= OTP_ATTEMPT_LIMIT) {
      await User.updateOne(
        { _id: existingUser._id },
        { $set: { 'authentication.oneTimeCode': null } },
      );
    }
    await AuthHelper.failOtpAttempt(userId);
  }

  // if otp matches -> check otp expiry and clear otp attempts
  const date = new Date();
  if (!authentication?.expireAt || date > authentication.expireAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again',
    );
  }

  await clearOtpAttempts(userId);

  let message;
  let data;

  // if user is not email verified -> verify email and return access and refresh tokens
  // else -> reset password and return reset token
  if (!existingUser.isEmailVerified) {
    await User.findOneAndUpdate(
      { _id: existingUser._id },
      {
        isEmailVerified: true,
        authentication: { oneTimeCode: null, expireAt: null },
      },
    );

    message = 'Email verify successfully';
    data = await AuthHelper.issueSessionTokens(existingUser, client);
  } else {
    await User.findOneAndUpdate(
      { _id: existingUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      },
    );

    const resetToken = cryptoToken();
    await ResetToken.create({
      user: existingUser._id,
      token: resetToken,
      expireAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    });
    message =
      'Verification Successful: Please securely store and utilize this code for reset password';
    data = { resetToken };
  }
  return { data, message };
};

// ------------------- reset password -------------------
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword,
) => {
  const { newPassword, confirmPassword } = payload;
  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication',
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'",
    );
  }

  //validity check
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password',
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!",
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData, {
    new: true,
  });
  await AuthSession.revokeAllLoginSessions(String(isExistToken.user));
};

// ------------------- change password -------------------
const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword,
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password',
    );
  }
  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched",
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
  await AuthSession.revokeAllLoginSessions(String(user.id));
};

// ------------------- refresh token -------------------
const refreshTokenToDB = async (token: string) => {
  const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_refresh_secret!);

  const isExistUser = await User.findById(decoded.id).select(
    '_id role status isDeleted',
  );
  if (!isExistUser || isExistUser.isDeleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isExistUser.status !== UserStatus.Active) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'It looks like your account has been suspended or deactivated.',
    );
  }

  const sessionId = String(decoded.sid ?? '');
  const session = await AuthSession.readSession(sessionId);
  if (!session || session.userId !== isExistUser._id.toString()) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'This session has ended. Please log in again.',
    );
  }

  const accessToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, sid: sessionId },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );
  const refreshToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, sid: sessionId },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string,
  );
  await AuthSession.extendUserSession(sessionId, refreshToken);

  return {
    accessToken,
    refreshToken,
    sessionId,
    role: isExistUser.role,
    _id: isExistUser._id,
  };
};

// ------------------- logout -------------------
const logoutFromDB = async (userId: string, sessionId: string) => {
  const removed = await AuthSession.revokeLoginSession(
    String(userId),
    sessionId,
  );
  if (!removed) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }
};

// ------------------- logout all -------------------
const logoutAllFromDB = async (userId: string) => {
  await AuthSession.revokeAllLoginSessions(String(userId));
};

// ------------------- list sessions -------------------
const listSessionsFromDB = async (userId: string) => {
  const sessions = await AuthSession.listLoginSessions(String(userId));
  return { count: sessions.length, sessions };
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  refreshTokenToDB,
  logoutFromDB,
  logoutAllFromDB,
  listSessionsFromDB,
};
