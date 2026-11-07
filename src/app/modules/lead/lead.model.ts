import { Schema, model } from 'mongoose';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';
import { LeadStatus } from './lead.constant';
import { ILead, LeadModel } from './lead.interface';

const leadSchema = new Schema<ILead, LeadModel>(
  {
    uid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
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
    budgetRange: {
      minimum: {
        type: Number,
        required: true,
      },
      maximum: {
        type: Number,
        required: true,
      },
    },
    timeline: {
      type: String,
      required: true,
      trim: true,
    },
    client: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        countryCode: {
          type: String,
          required: true,
          trim: true,
        },
        number: {
          type: String,
          required: true,
          trim: true,
        },
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: Object.values(LeadStatus),
      default: LeadStatus.Pending,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// map pin
leadSchema.index({ location: '2dsphere' });

// provider search is the full project address
leadSchema.index({ address: 'text' });

// auto increment uid
leadSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'LED',
  counterId: 'lead_sequence',
  padLength: 6,
});

export const Lead = model<ILead, LeadModel>('Lead', leadSchema);
