import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { createTestToken } from './auth.helper';

type UserOverrides = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  status?: UserStatus;
};

export const createTestUser = async (overrides: UserOverrides = {}) => {
  const user = await User.create({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    password: 'Password123!',
    role: UserRole.Client,
    isEmailVerified: true,
    status: UserStatus.Active,
    ...overrides,
  });

  const token = createTestToken(user.role, user._id.toString(), user.email);
  return { user, token };
};
