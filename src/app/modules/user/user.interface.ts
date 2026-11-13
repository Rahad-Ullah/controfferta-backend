import { Model, Types } from 'mongoose';
import { BusinessType } from '../provider/provider.constant';
import { UserRole, UserStatus } from './user.constant';

export interface IUser {
  _id: Types.ObjectId;
  uid: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roleRef: Types.ObjectId;
  email: string;
  password: string;
  image: string;
  phone: {
    countryCode: string;
    number: string;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  status: UserStatus;
  isOnline: boolean;
  lastSeenAt?: Date;
  isEmailVerified: boolean;
  isNotificationEnabled: boolean;
  isDeleted: boolean;
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: string | null;
    expireAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type IRegisterUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole.Client | UserRole.Provider;
  phone?: IUser['phone'];
  businessName?: string;
  businessType?: BusinessType;
  bio?: string;
  interestedCategories?: string[];
};

export type IProviderProfileUpdate = {
  businessName?: string;
  businessType?: BusinessType;
  bio?: string;
  interestedCategories?: string[];
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
