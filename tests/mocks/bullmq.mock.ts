import { vi } from 'vitest';

const { queueAddSpy, workerProcessors } = vi.hoisted(() => ({
  queueAddSpy: vi.fn(function add() {
    return Promise.resolve({ id: 'mock-job-id' });
  }),
  workerProcessors: [] as Array<(job: any) => Promise<any>>,
}));

export { queueAddSpy, workerProcessors };

vi.mock('bullmq', () => ({
  Queue: vi.fn(function Queue() {
    return {
      add: queueAddSpy,
      close: vi.fn(function close() {
        return Promise.resolve(undefined);
      }),
    };
  }),
  Worker: vi.fn(function Worker(_name, processor) {
    workerProcessors.push(processor);
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
  Job: vi.fn(function Job() {
    return {
      id: 'mock-job-id',
      data: {},
      updateProgress: vi.fn(function updateProgress() {
        return Promise.resolve(undefined);
      }),
    };
  }),
}));
