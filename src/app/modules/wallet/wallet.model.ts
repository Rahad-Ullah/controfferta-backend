import { model, Schema } from 'mongoose';
import { IWallet, WalletModel } from './wallet.interface';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';
import {
  PayoutProvider,
  SupportedCurrency,
  WalletStatus,
} from './wallet.constants';

const stripePayoutDetailsSchema = new Schema(
  {
    stripeAccountId: { type: String, required: true, trim: true },
    bankName: { type: String, trim: true },
    accountNumberLast4: { type: String, trim: true },
    fundingType: { type: String, trim: true },
    isOnboardingCompleted: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const walletSchema = new Schema<IWallet, WalletModel>(
  {
    uid: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(WalletStatus),
      default: WalletStatus.PendingOnboarding,
    },
    provider: {
      type: String,
      enum: Object.values(PayoutProvider),
      default: null,
    },
    currency: {
      type: String,
      enum: Object.values(SupportedCurrency),
      default: SupportedCurrency.Usd,
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    pendingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    gatewayBankInfo: {
      type: {
        [PayoutProvider.Stripe]: {
          type: stripePayoutDetailsSchema,
          required: false,
        },
      },
      default: null,
    },
  },
  { timestamps: true },
);

walletSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'WLT',
  counterId: 'wallet_sequence',
  padLength: 6,
});

export const Wallet = model<IWallet, WalletModel>('Wallet', walletSchema);
