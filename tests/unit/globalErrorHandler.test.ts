import { describe, expect, it, afterEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import config from '../../src/config';
import globalErrorHandler from '../../src/app/middlewares/globalErrorHandler';
import ApiError from '../../src/errors/ApiError';

const runHandler = (error: unknown) => {
  let status = 0;
  let body: Record<string, unknown> = {};
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      body = payload;
    },
  };

  globalErrorHandler(
    error as Error,
    {} as never,
    res as never,
    (() => undefined) as never,
  );

  return { status, body };
};

describe('globalErrorHandler', () => {
  const previous = config.node_env;

  afterEach(() => {
    config.node_env = previous;
  });

  it('hides an unknown error outside development', () => {
    config.node_env = 'production';
    const { status, body } = runHandler(
      new Error('E11000 duplicate key collection users'),
    );

    expect(status).toBe(500);
    expect(body).toMatchObject({
      success: false,
      message: 'Something went wrong',
      errorMessages: [],
    });
    expect(body.stack).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('E11000');
  });

  it('shows an unknown error in development', () => {
    config.node_env = 'development';
    const { status, body } = runHandler(new Error('E11000 duplicate key'));

    expect(status).toBe(500);
    expect(body.message).toBe('E11000 duplicate key');
    expect(body.errorMessages).toEqual([
      { path: '', message: 'E11000 duplicate key' },
    ]);
    expect(body.stack).toEqual(expect.any(String));
  });

  it('keeps an ApiError message in production', () => {
    config.node_env = 'production';
    const { status, body } = runHandler(
      new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found'),
    );

    expect(status).toBe(404);
    expect(body.message).toBe('FAQ not found');
    expect(body.stack).toBeUndefined();
  });
});
