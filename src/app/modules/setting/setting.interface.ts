import { Model, ObjectId } from 'mongoose';

export interface ISetting {
  _id: ObjectId;
  contactInfo: {
    email: string;
    phone: {
      countryCode: string;
      number: string;
    };
    whatsApp: {
      countryCode: string;
      number: string;
    };
    address: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
  };
  mobileAppLink: {
    googlePlay: string;
    appleStore: string;
  }
  socialLink: {
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
}

export type SettingModel = Model<ISetting>;