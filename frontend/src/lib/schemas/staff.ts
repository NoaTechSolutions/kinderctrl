import { z } from 'zod';

export const STAFF_ROLES = ['TEACHER', 'ASSISTANT', 'ADMIN'] as const;
export const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;
export const STAFF_STATUSES = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED',
] as const;

// BUG-037 fix: accept any formatted input the user types ("(123) 456-7890",
// "123-456-7890", "1234567890"). Validation strips non-digits and checks
// digit count. parsePhoneDigits in api/staff.ts cleans before sending.
function isValidUSPhone(v: string): boolean {
  if (v === '') return true;
  const digits = v.replace(/\D/g, '');
  // 10 digits, or 11 starting with US country code "1".
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

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
  // BUG-037: validation tolerates formatted input — refine on digits only.
  phone: z
    .string()
    .refine(isValidUSPhone, 'Phone must be a valid US number (10 digits)')
    .optional(),
  role: z.enum(STAFF_ROLES),
  hireDate: z.string().min(1, 'Required'),
  // PO QA #3 CAMBIO 9: optional. Empty string allowed; api/staff.ts strips
  // before sending so backend sees undefined → null.
  dateOfBirth: z.string().or(z.literal('')).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hourlyRate: hourlyRateField,
  notes: z.string().max(500, 'Too long').or(z.literal('')).optional(),
  // SUPER_ADMIN MUST select a center (form validates this per role-aware
  // hint in staff-form.tsx). DIRECTOR omits — backend defaults to their
  // User.centerId.
  centerId: z.string().uuid('Invalid center').optional(),
  // UI shortcuts that get translated to the discrete compliance fields by
  // the backend service. position is intentionally NOT in this schema —
  // per PO post-QA-2 decision, position is only set by the invitee via
  // /accept-invitation (D-1 free-text rationale preserved, but the
  // Director's manual-create form skips the field).
  backgroundCheckCompleted: z.boolean().optional(),
  cprCertified: z.boolean().optional(),
});

export type StaffFormData = z.infer<typeof staffCreateSchema>;

// In edit mode, status is editable and everything else is partial — but
// we keep the field-level constraints so editing one field still validates.
export const staffUpdateSchema = staffCreateSchema.partial().extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>;

// ─── Invitation flow schemas ────────────────────────────────────────

export const BACKGROUND_CHECK_STATUSES = [
  'NOT_STARTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;

// Inviter form (DIRECTOR or SUPER_ADMIN). centerId is required only for
// SUPER_ADMIN — the page hides the field for DIRECTOR. Validation message
// kept generic ("Please select a center") for the visible-to-user path.
export const inviteStaffSchema = z.object({
  email: z.string().email('Invalid email'),
  centerId: z.string().uuid('Invalid center').optional(),
});
export type InviteStaffFormData = z.infer<typeof inviteStaffSchema>;

// Invitee form on /accept-invitation. Mirrors the backend DTO contract
// from accept-invitation.dto.ts. Password rules match auth/register style.
//
// Phone is REQUIRED here (unlike staffCreateSchema where it's optional) —
// the backend DTO @Matches the same digit regex on a required field. We
// reuse isValidUSPhone via a non-empty refine so the user sees the same
// "must be a valid US number" message regardless of how they formatted it.
export const acceptInvitationSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Too short').max(50, 'Too long'),
    lastName: z.string().trim().min(2, 'Too short').max(50, 'Too long'),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .refine(
        (v) => v !== '' && isValidUSPhone(v),
        'Phone must be a valid US number (10 digits)',
      ),
    position: z.string().max(50, 'Too long').or(z.literal('')).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    agreedToTerms: z.literal(true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

// PATCH /staff/:id/background-check.
// Service-side rule: status=APPROVED requires `date`. The schema lets the
// form submit either way; the backend returns 400 with a clear message,
// caught by the form's onError.
export const updateBackgroundCheckSchema = z.object({
  status: z.enum(BACKGROUND_CHECK_STATUSES),
  date: z.string().or(z.literal('')).optional(),
  expiryDate: z.string().or(z.literal('')).optional(),
  notes: z.string().max(1000, 'Too long').or(z.literal('')).optional(),
});
export type UpdateBackgroundCheckFormData = z.infer<
  typeof updateBackgroundCheckSchema
>;

// PATCH /staff/:id/cpr. Same "let backend enforce the conditional" pattern.
export const updateCprSchema = z.object({
  certified: z.boolean(),
  certificationDate: z.string().or(z.literal('')).optional(),
  expiryDate: z.string().or(z.literal('')).optional(),
  provider: z.string().max(100, 'Too long').or(z.literal('')).optional(),
  notes: z.string().max(1000, 'Too long').or(z.literal('')).optional(),
});
export type UpdateCprFormData = z.infer<typeof updateCprSchema>;
