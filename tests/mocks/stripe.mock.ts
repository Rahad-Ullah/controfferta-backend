import { vi } from 'vitest';

export const stripeMock = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'cs_test_mock123',
        url: 'https://checkout.stripe.com/pay/mock',
      }),
    },
  },
  paymentIntents: {
    retrieve: vi.fn().mockResolvedValue({
      id: 'pi_test_mock123',
      latest_charge: {
        id: 'ch_test_mock123',
        balance_transaction: {
          id: 'txn_test_mock123',
          amount: 5000,
          fee: 100,
          net: 4900,
        },
      },
    }),
  },
  accounts: {
    create: vi.fn().mockResolvedValue({ id: 'acct_test_mock123' }),
  },
  accountLinks: {
    create: vi.fn().mockResolvedValue({
      url: 'https://connect.stripe.com/setup/mock',
    }),
  },
  transfers: {
    create: vi.fn().mockResolvedValue({ id: 'tr_test_mock123' }),
  },
  refunds: {
    create: vi.fn().mockResolvedValue({
      id: 're_test_mock123',
      status: 'succeeded',
    }),
  },
  balance: {
    retrieve: vi.fn().mockResolvedValue({
      available: [{ amount: 100000, currency: 'usd' }],
    }),
  },
  webhooks: {
    constructEvent: vi.fn().mockImplementation((_body, signature) => {
      if (signature && String(signature).includes('invalid')) {
        throw new Error('Invalid signature');
      }

      return {
        id: 'evt_test_mock123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_mock123',
            payment_status: 'paid',
            currency: 'usd',
            payment_intent: 'pi_test_mock123',
            payment_method_types: ['card'],
            metadata: {
              userId: '665f1234567890abcdef1234',
              referenceType: 'Order',
              referenceId: '665f1234567890abcdef5678',
            },
          },
        },
      };
    }),
  },
};

vi.mock('../../src/config/stripe', () => ({
  stripe: stripeMock,
}));
