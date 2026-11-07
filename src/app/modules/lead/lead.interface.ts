import { Model, Types } from 'mongoose';
import { LeadStatus } from './lead.constant';

export type ILead = {
  _id: Types.ObjectId;
  uid: string;
  category: Types.ObjectId;
  title: string;
  description: string;
  address: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  budgetRange: {
    minimum: number;
    maximum: number;
  };
  timeline: string;
  client: {
    name: string;
    email: string;
    phone: {
      countryCode: string;
      number: string;
    };
    address: string;
  };
  status: LeadStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadModel = Model<ILead>;
