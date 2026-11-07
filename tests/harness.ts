export type TestHarness = {
  sendMailSpy: ReturnType<typeof import('vitest')['vi']['fn']>;
  queueAddSpy: ReturnType<typeof import('vitest')['vi']['fn']>;
  workerProcessors: Array<(job: any) => Promise<any>>;
  putObjectSpy: ReturnType<typeof import('vitest')['vi']['fn']>;
  deleteObjectSpy: ReturnType<typeof import('vitest')['vi']['fn']>;
  s3SendSpy: ReturnType<typeof import('vitest')['vi']['fn']>;
  redisMock: {
    pipeline: ReturnType<typeof import('vitest')['vi']['fn']>;
    zrangebyscore: ReturnType<typeof import('vitest')['vi']['fn']>;
    zrem: ReturnType<typeof import('vitest')['vi']['fn']>;
  };
  stripeMock: {
    accounts: { create: ReturnType<typeof import('vitest')['vi']['fn']> };
    transfers: { create: ReturnType<typeof import('vitest')['vi']['fn']> };
    paymentIntents: {
      retrieve: ReturnType<typeof import('vitest')['vi']['fn']>;
    };
    webhooks: {
      constructEvent: ReturnType<typeof import('vitest')['vi']['fn']>;
    };
  };
};

export const harness = (): TestHarness =>
  (globalThis as { __testHarness?: TestHarness }).__testHarness as TestHarness;
