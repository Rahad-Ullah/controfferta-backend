import { Schema, model } from 'mongoose';
import { ICounter, CounterModel } from './counter.interface';

const counterSchema = new Schema<ICounter, CounterModel>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  seq: {
    type: Number,
    required: true,
    default: 0,
  },
});

export const Counter = model<ICounter, CounterModel>(
  'Counter',
  counterSchema
);