import { z } from 'zod';

const createLoginZodSchema = z.object({
  body: z
    .object({
      email: z
        .string({ required_error: 'Email is required' })
        .email('Not a valid email!')
        .nonempty("Email can't be empty!"),
      password: z
        .string({ required_error: 'Password is required' })
        .nonempty("Password can't be empty!"),
    })
    .strict(),
});

const createForgetPasswordZodSchema = z.object({
  body: z
    .object({
      email: z
        .string({ required_error: 'Email is required' })
        .email('Not a valid email!')
        .nonempty("Email can't be empty!"),
    })
    .strict(),
});

const createVerifyEmailZodSchema = z.object({
  body: z
    .object({
      email: z
        .string({ required_error: 'Email is required' })
        .email('Not a valid email!')
        .nonempty("Email can't be empty!"),
      oneTimeCode: z
        .number({ required_error: 'One time code is required' })
        .nonnegative('One time code must be a positive number'),
    })
    .strict(),
});

const createResetPasswordZodSchema = z.object({
  body: z
    .object({
      newPassword: z
        .string({ required_error: 'Password is required' })
        .nonempty("Password can't be empty!")
        .min(8, 'Password must be at least 8 characters long'),
      confirmPassword: z
        .string({
          required_error: 'Confirm Password is required',
        })
        .nonempty("Confirm Password can't be empty!")
        .min(8, 'Confirm Password must be at least 8 characters long'),
    })
    .strict()
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
    }),
});

const createChangePasswordZodSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({
          required_error: 'Current Password is required',
        })
        .nonempty("Current Password can't be empty!"),
      newPassword: z
        .string({ required_error: 'New Password is required' })
        .nonempty("New Password can't be empty!"),
      confirmPassword: z
        .string({
          required_error: 'Confirm Password is required',
        })
        .nonempty("Confirm Password can't be empty!"),
    })
    .strict()
    .refine(data => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
    }),
});

// refresh token
const refreshTokenZodSchema = z.object({
  body: z
    .object({
      refreshToken: z
        .string({ required_error: 'Refresh token is required' })
        .nonempty("Refresh token can't be empty!"),
    })
    .strict(),
});

export const AuthValidation = {
  createVerifyEmailZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  refreshTokenZodSchema,
};
