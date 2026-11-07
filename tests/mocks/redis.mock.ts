import { vi } from 'vitest';

const { redisMock } = vi.hoisted(() => {
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

  return { redisMock };
});

export { redisMock };

vi.mock('ioredis', () => ({
  default: vi.fn(function Redis() {
    return redisMock;
  }),
  Redis: vi.fn(function Redis() {
    return redisMock;
  }),
}));
