import { z } from 'zod';

export const STAFF_ROLES = ['TEACHER', 'ASSISTANT', 'ADMIN'] as const;
export const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;
export const STAFF_STATUSES = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
] as const;

// Same phone regex as the backend DTO and CenterForm — keep them in sync.
const phoneRegex = /^\+?1?\d{10,14}$/;

// `hourlyRate` is optional in the schema. The form binds it as a number
// (valueAsNumber) and renders as empty when undefined; coerce NaN → undefined
// so an empty input doesn't fail validation as "not a number".
const hourlyRateField = z
  .preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : v),
    z.number({ invalid_type_error: 'Must be a number' }).positive().max(999.99),
  )
  .optional();

export const staffCreateSchema = z.object({
  firstName: z.string().trim().min(2, 'Too short').max(50, 'Too long'),
  lastName: z.string().trim().min(2, 'Too short').max(50, 'Too long'),
  email: z.string().email('Invalid email'),
  // Empty string allowed (matches the "leave blank = no phone" intent);
  // API client strips it before sending so backend sees undefined → null.
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid US phone')
    .or(z.literal(''))
    .optional(),
  role: z.enum(STAFF_ROLES),
  hireDate: z.string().min(1, 'Required'),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hourlyRate: hourlyRateField,
  notes: z.string().max(500, 'Too long').or(z.literal('')).optional(),
});

export type StaffFormData = z.infer<typeof staffCreateSchema>;

// In edit mode, status is editable and everything else is partial — but
// we keep the field-level constraints so editing one field still validates.
export const staffUpdateSchema = staffCreateSchema.partial().extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>;
