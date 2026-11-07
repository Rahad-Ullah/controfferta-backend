import { Schema, model } from 'mongoose';
import { IDisclaimer, DisclaimerModel } from './disclaimer.interface';
import { DisclaimerType } from './disclaimer.constants';

const disclaimerSchema = new Schema<IDisclaimer, DisclaimerModel>({
  type: {
    type: String,
    enum: DisclaimerType,
    required: true,
    unique: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export const Disclaimer = model<IDisclaimer, DisclaimerModel>(
  'Disclaimer',
  disclaimerSchema
);