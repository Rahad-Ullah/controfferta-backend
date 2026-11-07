import { describe, expect, it } from 'vitest';
import { Secret } from 'jsonwebtoken';
import config from '../../src/config';
import { jwtHelper } from '../../src/helpers/jwtHelper';
import cryptoHelper from '../../src/helpers/cryptoHelper';
import generateOTP from '../../src/utils/generateOTP';
import { generateSlug } from '../../src/utils/generateSlug';
import { UserRole } from '../../src/app/modules/user/user.constant';

describe('jwtHelper', () => {
  it('signs and verifies a payload', () => {
    const token = jwtHelper.createToken(
      { id: 'user-1', role: UserRole.Client, email: 'jane@example.com' },
      config.jwt.jwt_secret as Secret,
      '1h',
    );

    const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
    expect(decoded).toMatchObject({
      id: 'user-1',
      role: UserRole.Client,
      email: 'jane@example.com',
    });
  });
});

describe('cryptoHelper', () => {
  it('round-trips a string', () => {
    const encrypted = cryptoHelper.encrypt('starter-secret');
    expect(encrypted.split(':')).toHaveLength(3);
    expect(cryptoHelper.decrypt(encrypted)).toBe('starter-secret');
  });
});

describe('generateOTP', () => {
  it('returns a number with the requested digit length', () => {
    const otp = generateOTP(6);
    expect(otp).toBeGreaterThanOrEqual(100000);
    expect(otp).toBeLessThanOrEqual(999999);
  });
});

describe('generateSlug', () => {
  it('slugifies a title and rejects an empty one', () => {
    expect(generateSlug('Hello, World!')).toBe('hello-world');
    expect(() => generateSlug('   ')).toThrow(/Title is required/);
  });
});
