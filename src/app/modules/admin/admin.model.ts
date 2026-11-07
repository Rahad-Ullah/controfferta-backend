import { Schema, model } from 'mongoose';
import { IAdmin, AdminModel } from './admin.interface';

const adminSchema = new Schema<IAdmin, AdminModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  permissions: {
    type: [String],
    required: true,
  },
});

export const Admin = model<IAdmin, AdminModel>('Admin', adminSchema);
