import { Secret } from 'jsonwebtoken';
import config from '../../src/config';
import { jwtHelper } from '../../src/helpers/jwtHelper';
import { UserRole } from '../../src/app/modules/user/user.constant';

export const createTestToken = (
  role: UserRole = UserRole.Client,
  userId: string = '665f1234567890abcdef1234',
  email: string = 'jane.doe@example.com',
): string => {
  return jwtHelper.createToken(
    { id: userId, role, email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in || '1h',
  );
};

export const createRefreshToken = (
  role: UserRole,
  userId: string,
  email: string,
): string => {
  return jwtHelper.createToken(
    { id: userId, role, email },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in || '7d',
  );
};

export const authHeader = (token: string) => `Bearer ${token}`;
