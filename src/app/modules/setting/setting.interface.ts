import { Model, Types } from 'mongoose';

export type ISettingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type ISettingSocialLinks = {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  reddit: string;
  weChat: string;
  discord: string;
  telegram: string;
};

export type ISetting = {
  _id: Types.ObjectId;
  welcomeCreditAmount: number;
  contactInfo: {
    email: string;
    phone: string;
    whatsApp: string;
    address: ISettingAddress;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  socialLinks: ISettingSocialLinks;
};

export type SettingModel = Model<ISetting>;
