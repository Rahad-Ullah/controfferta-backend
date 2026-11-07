import { Model } from 'mongoose';

export interface ICounter {
  id: string;
  seq: number;
}

export type CounterModel = Model<ICounter>;