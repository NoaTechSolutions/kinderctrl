import { z } from 'zod';
import { VALID_TIMEZONES } from '@/lib/types/center';

export const centerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),

  street: z
    .string()
    .min(5, 'Street is required')
    .max(200, 'Street must be less than 200 characters'),

  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City must be less than 100 characters'),

  state: z
    .string()
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters (e.g., CA, NY)'),

  zipCode: z
    .string()
    .regex(
      /^\d{5}(-\d{4})?$/,
      'Invalid ZIP code (e.g., 94102 or 94102-1234)',
    ),

  phone: z
    .string()
    .regex(
      /^\(\d{3}\) \d{3}-\d{4}$/,
      'Invalid US phone (e.g., (510) 787-9876)',
    ),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),

  website: z
    .string()
    .url('Website must be a valid URL (e.g., https://example.com)')
    .optional()
    .or(z.literal('')),

  capacity: z
    .number({ message: 'Capacity is required' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(1000, 'Capacity must be less than 1000'),

  timezone: z
    .enum(VALID_TIMEZONES)
    .default('America/Los_Angeles')
    .optional(),

  licenseNumber: z.string().max(50).optional().or(z.literal('')),
});

export type CenterFormData = z.infer<typeof centerSchema>;

export const centerUpdateSchema = centerSchema.partial();

export type CenterUpdateData = z.infer<typeof centerUpdateSchema>;
