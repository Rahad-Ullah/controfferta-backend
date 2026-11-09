import { Schema, model } from 'mongoose';
import { DEFAULT_WELCOME_CREDIT_AMOUNT } from './setting.constants';
import { ISetting, SettingModel } from './setting.interface';

const settingSchema = new Schema<ISetting, SettingModel>({
  welcomeCreditAmount: {
    type: Number,
    default: DEFAULT_WELCOME_CREDIT_AMOUNT,
    min: 0,
  },
  contactInfo: {
    email: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    whatsApp: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      line1: {
        type: String,
        default: '',
        trim: true,
      },
      line2: {
        type: String,
        default: '',
        trim: true,
      },
      city: {
        type: String,
        default: '',
        trim: true,
      },
      state: {
        type: String,
        default: '',
        trim: true,
      },
      postalCode: {
        type: String,
        default: '',
        trim: true,
      },
      country: {
        type: String,
        default: '',
        trim: true,
      },
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
  socialLinks: {
    facebook: {
      type: String,
      default: '',
      trim: true,
    },
    instagram: {
      type: String,
      default: '',
      trim: true,
    },
    twitter: {
      type: String,
      default: '',
      trim: true,
    },
    linkedin: {
      type: String,
      default: '',
      trim: true,
    },
    youtube: {
      type: String,
      default: '',
      trim: true,
    },
    tiktok: {
      type: String,
      default: '',
      trim: true,
    },
    reddit: {
      type: String,
      default: '',
      trim: true,
    },
    weChat: {
      type: String,
      default: '',
      trim: true,
    },
    discord: {
      type: String,
      default: '',
      trim: true,
    },
    telegram: {
      type: String,
      default: '',
      trim: true,
    },
  },
});

settingSchema.index({ 'contactInfo.location': '2dsphere' });

export const Setting = model<ISetting, SettingModel>('Setting', settingSchema);
