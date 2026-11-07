import { UserRole } from '../app/modules/user/user.constant';
import { User } from '../app/modules/user/user.model';
import config from '../config';
import { logger } from '../shared/logger';

const payload = {
  firstName: 'Mr.',
  lastName: 'Super Admin',
  email: config.super_admin.email,
  role: UserRole.SuperAdmin,
  password: config.super_admin.password,
  isEmailVerified: true,
};

export const seedSuperAdmin = async () => {
  const isExistSuperAdmin = await User.findOne({
    role: UserRole.SuperAdmin,
  });
  if (!isExistSuperAdmin) {
    await User.create(payload);
    logger.info('✨ Super Admin account has been successfully created!');
  }
};
