import { z } from 'zod';
import { BusinessType } from '../provider/provider.constant';
import { UserRole, UserStatus } from './user.constant';
import { objectId } from '../../../shared/objectIdValidator';

const accountFields = {
  firstName: z.string({ error: 'First name is required' }),
  lastName: z.string({ error: 'Last name is required' }),
  email: z
    .string({ error: 'Email is required' })
    .email('Invalid email address'),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  phone: z
    .object({
      countryCode: z.string().min(1).max(5).optional(),
      number: z.string().optional(),
    })
    .optional(),
};

const providerFields = {
  businessName: z
    .string({ error: 'Business name is required' })
    .trim()
    .min(1, 'Business name is required'),
  businessType: z.nativeEnum(BusinessType).optional(),
  bio: z.string().optional(),
  interestedCategories: z.array(objectId('category')).optional(),
};

const createUserZodSchema = z.object({
  body: z.discriminatedUnion('role', [
    z
      .object({
        role: z.literal(UserRole.Client),
        ...accountFields,
      })
      .strict(),
    z
      .object({
        role: z.literal(UserRole.Provider),
        ...accountFields,
        ...providerFields,
      })
      .strict(),
  ]),
});

const updateUserZodSchema = z.object({
  body: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      image: z.union([z.string().url(), z.literal('')]).optional(),
      phone: z
        .object({
          countryCode: z.string().max(5).optional(),
          number: z.string().optional(),
        })
        .optional(),
      address: z
        .object({
          line1: z.string().optional(),
          line2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
      location: z
        .object({
          type: z.string().optional(),
          coordinates: z.array(z.number()).optional(),
        })
        .optional(),
      isNotificationEnabled: z.boolean().optional(),
      businessName: z.string().trim().min(1).optional(),
      businessType: z.nativeEnum(BusinessType).optional(),
      bio: z.string().optional(),
      interestedCategories: z.array(objectId('category')).optional(),
    })
    .strict(),
});

const updateStatusZodSchema = z.object({
  params: z
    .object({
      id: objectId('user id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(UserStatus, {
        error: 'Status is required',
      }),
    })
    .strict(),
});

// delete user
const deleteUserZodSchema = z.object({
  params: z
    .object({
      id: objectId('user id'),
    })
    .strict(),
});

// get single user
const getSingleUserZodSchema = z.object({
  params: z
    .object({
      id: objectId('user id'),
    })
    .strict(),
});

// get all users
const getAllUsersZodSchema = z.object({
  query: z
    .object({
      searchTerm: z.string().optional(),
      status: z.nativeEnum(UserStatus).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .strict(),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserZodSchema,
  updateStatusZodSchema,
  deleteUserZodSchema,
  getSingleUserZodSchema,
  getAllUsersZodSchema,
};
