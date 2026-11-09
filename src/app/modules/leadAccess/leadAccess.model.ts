import { Schema, model } from 'mongoose';
import { LeadAccessStatus } from './leadAccess.constant';
import { ILeadAccess, LeadAccessModel } from './leadAccess.interface';

const leadAccessSchema = new Schema<ILeadAccess, LeadAccessModel>(
  {
    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    creditCost: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(LeadAccessStatus),
      default: LeadAccessStatus.Unlocked,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    unlockedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// one unlock per provider and lead
leadAccessSchema.index({ lead: 1, provider: 1 }, { unique: true });

// model name matches CreditLedger.reference.type so the ledger can populate this row
export const LeadAccess = model<ILeadAccess, LeadAccessModel>(
  'lead_access',
  leadAccessSchema,
);
