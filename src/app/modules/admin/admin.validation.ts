import { z } from 'zod';
import { UserStatus } from '../user/user.constant';
import { objectId } from '../../../shared/objectIdValidator';

// create admin validation
const createAdminZodSchema = z.object({
  body: z
    .object({
      name: z.string().nonempty('Name is required'),
      email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address'),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters long'),
      phone: z.coerce
        .string({ required_error: 'Phone is required' })
        .optional(),
      permissions: z.array(z.string()).optional(),
    })
    .strict(),
});

// update admin validation
const updateAdminZodSchema = z.object({
  body: z
    .object({
      name: z.string().nonempty('Name cannot be empty').optional(),
      email: z.string().email('Invalid email address').optional(),
      phone: z.coerce
        .string({ required_error: 'Phone is required' })
        .min(10, 'Phone must be at least 10 characters long')
        .max(15, 'Phone must be at most 15 characters long')
        .optional(),
      permissions: z.array(z.string()).optional(),
      status: z.nativeEnum(UserStatus).optional(),
    })
    .strict(),
});

// delete admin validation
const deleteAdminZodSchema = z.object({
  params: z
    .object({
      id: objectId('Admin'),
    })
    .strict(),
});

export const AdminValidations = {
  createAdminZodSchema,
  updateAdminZodSchema,
  deleteAdminZodSchema,
};
