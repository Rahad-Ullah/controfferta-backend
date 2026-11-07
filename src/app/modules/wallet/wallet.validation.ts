import { z } from 'zod';
import { PayoutProvider, SupportedCurrency } from './wallet.constants';

export const connectPayoutMethod = z.object({
  body: z
    .object({
      currency: z.nativeEnum(SupportedCurrency, {
        required_error: 'Currency is required',
      }),
      gatewayBankInfo: z
        .object({
          [PayoutProvider.Stripe]: z
            .object({
              bankName: z.string().trim().optional(),
              accountNumberLast4: z.string().trim().max(4).optional(),
            })
            .optional(),
        })
        .strict(),
    })
    .strict()
    .superRefine((bodyData, ctx) => {
      const { currency, gatewayBankInfo } = bodyData;

      if (currency === SupportedCurrency.Usd) {
        if (!gatewayBankInfo[PayoutProvider.Stripe]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Stripe account information block is missing.',
            path: ['body', 'gatewayBankInfo', PayoutProvider.Stripe],
          });
        }
      }
    }),
});

export const payoutWithdrawal = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Withdrawal amount is required' })
      .int('Amount must be an integer.')
      .positive('Withdrawal amount must be greater than 0.'),
  }),
});

export const WalletValidations = {
  connectPayoutMethod,
  payoutWithdrawal,
};
