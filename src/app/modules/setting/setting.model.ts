import { Schema, model } from 'mongoose';
import { ISetting, SettingModel } from './setting.interface';

const settingSchema = new Schema<ISetting, SettingModel>({
  contactInfo: {
    email: {
      type: String,
      default: '',
    },
    phone: {
      countryCode: {
        type: String,
        default: '',
      },
      number: {
        type: String,
        default: '',
      },
    },
    whatsApp: {
      countryCode: {
        type: String,
        default: '',
      },
      number: {
        type: String,
        default: '',
      },
    },
    address: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  mobileAppLink: {
    googlePlay: {
      type: String,
      default: '',
    },
    appleStore: {
      type: String,
      default: '',
    },
  },
  socialLink: {
    facebook: {
      type: String,
      default: '',
    },
    instagram: {
      type: String,
      default: '',
    },
    twitter: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
    youtube: {
      type: String,
      default: '',
    },
    tiktok: {
      type: String,
      default: '',
    },
    reddit: {
      type: String,
      default: '',
    },
    weChat: {
      type: String,
      default: '',
    },
    discord: {
      type: String,
      default: '',
    },
    telegram: {
      type: String,
      default: '',
    },
  },
});

export const Setting = model<ISetting, SettingModel>(
  'Setting',
  settingSchema
);