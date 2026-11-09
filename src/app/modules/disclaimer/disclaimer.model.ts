import { Schema, model } from 'mongoose';
import { DisclaimerType } from './disclaimer.constants';
import { IDisclaimer, DisclaimerModel } from './disclaimer.interface';

const disclaimerSchema = new Schema<IDisclaimer, DisclaimerModel>(
  {
    type: {
      type: String,
      enum: Object.values(DisclaimerType),
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export const Disclaimer = model<IDisclaimer, DisclaimerModel>(
  'Disclaimer',
  disclaimerSchema,
);
