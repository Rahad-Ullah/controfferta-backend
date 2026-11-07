import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { TestHarness } from './harness';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

const state = vi.hoisted(() => {
  const sendMailSpy = vi.fn(function sendMail() {
    return Promise.resolve({
      messageId: 'mock-email-id',
      accepted: ['jane.doe@example.com'],
    });
  });
  const queueAddSpy = vi.fn(function add() {
    return Promise.resolve({ id: 'mock-job-id' });
  });
  const workerProcessors: Array<(job: any) => Promise<any>> = [];
  const putObjectSpy = vi.fn(function putObject(args) {
    return args;
  });
  const deleteObjectSpy = vi.fn(function deleteObject(args) {
    return args;
  });
  const s3SendSpy = vi.fn(function send() {
    return Promise.resolve({});
  });
  const pipeline = {
    zadd: vi.fn(function zadd() {
      return pipeline;
    }),
    exec: vi.fn(function exec() {
      return Promise.resolve([]);
    }),
  };
  const redisMock = {
    get: vi.fn(function get() {
      return Promise.resolve(null);
    }),
    set: vi.fn(function set() {
      return Promise.resolve('OK');
    }),
    del: vi.fn(function del() {
      return Promise.resolve(1);
    }),
    quit: vi.fn(function quit() {
      return Promise.resolve('OK');
    }),
    disconnect: vi.fn(function disconnect() {
      return Promise.resolve(undefined);
    }),
    on: vi.fn(function on() {
      return undefined;
    }),
    status: 'ready',
    call: vi.fn(function call() {
      return Promise.resolve('OK');
    }),
    zadd: vi.fn(function zadd() {
      return Promise.resolve(1);
    }),
    zrem: vi.fn(function zrem() {
      return Promise.resolve(1);
    }),
    zrangebyscore: vi.fn(function zrangebyscore() {
      return Promise.resolve([]);
    }),
    pipeline: vi.fn(function pipelineFn() {
      return pipeline;
    }),
  };
  const stripeMock = {
    checkout: {
      sessions: {
        create: vi.fn(function create() {
          return Promise.resolve({
            id: 'cs_test_mock123',
            url: 'https://checkout.stripe.com/pay/mock',
          });
        }),
      },
    },
    paymentIntents: {
      retrieve: vi.fn(function retrieve() {
        return Promise.resolve({
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
        });
      }),
    },
    accounts: {
      create: vi.fn(function create() {
        return Promise.resolve({ id: 'acct_test_mock123' });
      }),
    },
    accountLinks: {
      create: vi.fn(function create() {
        return Promise.resolve({
          url: 'https://connect.stripe.com/setup/mock',
        });
      }),
    },
    transfers: {
      create: vi.fn(function create() {
        return Promise.resolve({ id: 'tr_test_mock123' });
      }),
    },
    refunds: {
      create: vi.fn(function create() {
        return Promise.resolve({ id: 're_test_mock123', status: 'succeeded' });
      }),
    },
    balance: {
      retrieve: vi.fn(function retrieve() {
        return Promise.resolve({
          available: [{ amount: 100000, currency: 'usd' }],
        });
      }),
    },
    webhooks: {
      constructEvent: vi.fn(function constructEvent(_body, signature) {
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

  const harness: TestHarness = {
    sendMailSpy,
    queueAddSpy,
    workerProcessors,
    putObjectSpy,
    deleteObjectSpy,
    s3SendSpy,
    redisMock,
    stripeMock,
  };

  (globalThis as { __testHarness?: TestHarness }).__testHarness = harness;
  return harness;
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(function createTransport() {
      return {
        sendMail: state.sendMailSpy,
        verify: vi.fn(function verify() {
          return Promise.resolve(true);
        }),
      };
    }),
  },
}));

vi.mock('ioredis', () => ({
  default: vi.fn(function Redis() {
    return state.redisMock;
  }),
  Redis: vi.fn(function Redis() {
    return state.redisMock;
  }),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn(function Queue() {
    return {
      add: state.queueAddSpy,
      close: vi.fn(function close() {
        return Promise.resolve(undefined);
      }),
    };
  }),
  Worker: vi.fn(function Worker(_name, processor) {
    state.workerProcessors.push(processor);
    return {
      on: vi.fn(function on() {
        return undefined;
      }),
      close: vi.fn(function close() {
        return Promise.resolve(undefined);
      }),
    };
  }),
  QueueEvents: vi.fn(function QueueEvents() {
    return {
      on: vi.fn(function on() {
        return undefined;
      }),
      close: vi.fn(function close() {
        return Promise.resolve(undefined);
      }),
    };
  }),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function S3Client() {
    return { send: state.s3SendSpy };
  }),
  PutObjectCommand: state.putObjectSpy,
  DeleteObjectCommand: state.deleteObjectSpy,
}));

vi.mock('../src/config/stripe', () => ({
  stripe: state.stripeMock,
}));

vi.mock('../src/config/elastic-search', () => ({
  elasticSearch: {
    index: vi.fn(function index() {
      return Promise.resolve({ result: 'created' });
    }),
    search: vi.fn(function search() {
      return Promise.resolve({ hits: { hits: [], total: { value: 0 } } });
    }),
    update: vi.fn(function update() {
      return Promise.resolve({ result: 'updated' });
    }),
    delete: vi.fn(function del() {
      return Promise.resolve({ result: 'deleted' });
    }),
    ping: vi.fn(function ping() {
      return Promise.resolve(true);
    }),
    close: vi.fn(function close() {
      return Promise.resolve(undefined);
    }),
  },
}));

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(mongo.getUri());

  // Importing the app registers Mongoose models. Collections must exist
  // before a transaction writes to them, or Mongo reports the namespace
  // is already in use.
  await import('../src/app');
  await Promise.all(
    Object.values(mongoose.models).map(async model => {
      await model.createCollection();
      await model.syncIndexes();
    }),
  );
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
