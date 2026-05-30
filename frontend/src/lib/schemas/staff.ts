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

// `hourlyRate` is optional. PO QA #50: the form now binds it via the
// NumericInput component (string in form state). The preprocess below
// accepts either a string ("25.50") or a number (legacy callers) and
// normalizes empty / NaN to undefined so optional() is honored. The
// inner schema enforces positive + max — the spec asks for "solo
// números positivos" explicitly.
const hourlyRateField = z
  .preprocess(
    (v) => {
      if (v === '' || v == null) return undefined;
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isNaN(n) ? undefined : n;
      }
      if (typeof v === 'number' && Number.isNaN(v)) return undefined;
      return v;
    },
    z
      .number({ invalid_type_error: 'Must be a number' })
      .positive('Must be greater than 0')
      .max(999.99, 'Maximum is 999.99'),
  )
  .optional();

// PO QA #31 — emergency contact relationship whitelist. Must mirror the
// backend's EMERGENCY_CONTACT_RELATIONSHIPS exactly. Kept here as a
// const so zod can build the enum without a separate import path.
const RELATIONSHIPS = [
  'father',
  'mother',
  'spouse',
  'partner',
  'sibling',
  'friend',
  'other',
] as const;

// Phone validator reused for both emergency contacts.
const optionalEmergencyPhone = z
  .string()
  .refine(
    (v) => !v || isValidUSPhone(v),
    'Emergency contact phone must be a valid US number',
  )
  .optional();

// PO QA #46 — BG collapsed to 3 lifecycle states. Outcome lives in the
// separate `approved` boolean.
export const BACKGROUND_CHECK_STATUSES = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const;

// PO QA #49 — CPR 4-state model. Mirror of BG with explicit ACTIVE /
// EXPIRED phases (no derived-from-date). Declared above staffCreateSchema
// because it's referenced inside the schema (avoid TDZ at module load).
export const CPR_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const;

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
  // PO QA #32: hireDate + employmentType are no longer required in the
  // UI. The backend defaults them in createWithSetupEmail (hireDate=now,
  // employmentType='full_time') when omitted. Empty string allowed and
  // stripped by the api client.
  hireDate: z.string().or(z.literal('')).optional(),
  // PO QA #3 CAMBIO 9: optional. Empty string allowed; api/staff.ts strips
  // before sending so backend sees undefined → null.
  dateOfBirth: z.string().or(z.literal('')).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  hourlyRate: hourlyRateField,
  notes: z.string().max(500, 'Too long').or(z.literal('')).optional(),
  // SUPER_ADMIN MUST select a center (form validates this per role-aware
  // hint in staff-form.tsx). DIRECTOR omits — backend defaults to their
  // User.centerId.
  centerId: z.string().uuid('Invalid center').optional(),
  // PO QA #31 — address + emergency contacts on the SUPER_ADMIN create
  // form. All optional. Same shape as Center/profile address fields.
  street: z.string().trim().max(200, 'Too long').or(z.literal('')).optional(),
  city: z.string().trim().max(100, 'Too long').or(z.literal('')).optional(),
  state: z
    .string()
    .regex(/^([A-Z]{2})?$/, 'State must be 2 uppercase letters')
    .optional(),
  zipCode: z
    .string()
    .regex(/^(\d{5}(-\d{4})?)?$/, 'Invalid ZIP (e.g., 94102 or 94102-1234)')
    .optional(),
  emergencyContactName: z
    .string()
    .trim()
    .max(100, 'Too long')
    .or(z.literal(''))
    .optional(),
  emergencyContactPhone: optionalEmergencyPhone,
  emergencyContactRelationship: z.enum(RELATIONSHIPS).or(z.literal('')).optional(),
  emergencyContact2Name: z
    .string()
    .trim()
    .max(100, 'Too long')
    .or(z.literal(''))
    .optional(),
  emergencyContact2Phone: optionalEmergencyPhone,
  emergencyContact2Relationship: z.enum(RELATIONSHIPS).or(z.literal('')).optional(),
  // UI shortcuts that get translated to the discrete compliance fields by
  // the backend service. position is intentionally NOT in this schema —
  // per PO post-QA-2 decision, position is only set by the invitee via
  // /accept-invitation (D-1 free-text rationale preserved, but the
  // Director's manual-create form skips the field).
  backgroundCheckCompleted: z.boolean().optional(),
  cprCertified: z.boolean().optional(),
  // PO QA #47 (BUG 1 fix): status is registered in the form via a
  // Controller (status section, edit-only) but lives outside the schema
  // historically. zod's default strip mode silently drops unknown fields
  // from the resolver output — so onSubmit was receiving data WITHOUT
  // status, and the PATCH never updated it. Declaring it optional here
  // makes it survive the resolver and reach the parent's onSubmit.
  // Optional because /staff/new doesn't surface a status picker (Staff
  // defaults to INVITED server-side).
  status: z.enum(STAFF_STATUSES).optional(),
  // PO QA #46: BG date / expiry / notes dropped alongside the schema
  // simplification. The only BG fields surfaced in the edit form are
  // Status (dropdown) + Approved (checkbox shown when status=Completed)
  // — both live under `backgroundCheckCompleted` (legacy create-form
  // shortcut, still meaningful) and a new `backgroundCheckApproved`.
  backgroundCheckApproved: z.boolean().optional(),
  // PO QA #49: CPR adopts the explicit-status model (mirror of BG).
  // `cprCertified` boolean above is the CREATE-form shortcut only
  // (translated server-side to status=ACTIVE+date=now). `cprStatus`
  // below is the EDIT-form picker. Both live in the schema so the
  // form's Controller/select can read either branch; the /edit page
  // strips them before PATCH /staff/:id and forwards them to the
  // dedicated /staff/:id/cpr endpoint instead.
  cprStatus: z.enum(CPR_STATUSES).optional(),
  cprCertificationDate: z.string().or(z.literal('')).optional(),
  cprExpiryDate: z.string().or(z.literal('')).optional(),
  cprNotes: z.string().max(1000, 'Too long').or(z.literal('')).optional(),
});

export type StaffFormData = z.infer<typeof staffCreateSchema>;

// In edit mode, status is editable and everything else is partial — but
// we keep the field-level constraints so editing one field still validates.
export const staffUpdateSchema = staffCreateSchema.partial().extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>;

// ─── Invitation flow schemas ────────────────────────────────────────

// (BACKGROUND_CHECK_STATUSES + CPR_STATUSES moved to the top of the file
// — they were declared here originally but staffCreateSchema above
// references CPR_STATUSES, which triggered a TDZ ReferenceError at
// module load time. Keep them above the schemas that consume them.)

// Optional pre-fill applied to the new Staff record on accept (PO QA #28
// Opción F). All fields optional; the modal shows them inside a
// collapsed "Pre-fill operational data" section. The invitee-supplied
// fields (firstName, lastName, phone, password) always win over prefill
// at accept-time.
export const invitePrefillSchema = z.object({
  hireDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time']).optional(),
  // PO QA #50: same preprocess as hourlyRateField above — accept string
  // from the NumericInput, convert to number, normalize empties to
  // undefined. Positive enforcement matches the form's behavior.
  hourlyRate: z
    .preprocess(
      (v) => {
        if (v === '' || v == null) return undefined;
        if (typeof v === 'string') {
          const n = Number(v);
          return Number.isNaN(n) ? undefined : n;
        }
        if (typeof v === 'number' && Number.isNaN(v)) return undefined;
        return v;
      },
      z
        .number({ invalid_type_error: 'Must be a number' })
        .positive('Must be greater than 0')
        .max(999.99, 'Maximum is 999.99'),
    )
    .optional(),
  position: z.string().trim().max(100, 'Too long').optional(),
});
export type InvitePrefillFormData = z.infer<typeof invitePrefillSchema>;

// Inviter form (DIRECTOR or SUPER_ADMIN). centerId is required only for
// SUPER_ADMIN — the page hides the field for DIRECTOR. Validation message
// kept generic ("Please select a center") for the visible-to-user path.
export const inviteStaffSchema = z.object({
  email: z.string().email('Invalid email'),
  centerId: z.string().uuid('Invalid center').optional(),
  prefill: invitePrefillSchema.optional(),
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
    // position removed per PO QA #8 (Opción C) — invitee skips it and
    // completes the optional fields later via /profile/complete.
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

// PO QA #8 Opción C — /staff/me/profile body. All fields optional; the
// "Skip for now" button submits an empty body which still flips
// profileComplete=true server-side. Address split into 4 fields matching
// Center's pattern (PO QA #11) — regex aligns with centerSchema so a
// future shared util can DRY them.
export const updateProfileSchema = z.object({
  dateOfBirth: z.string().or(z.literal('')).optional(),
  street: z.string().max(200, 'Too long').or(z.literal('')).optional(),
  city: z.string().max(100, 'Too long').or(z.literal('')).optional(),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters (e.g., CA, NY)')
    .or(z.literal(''))
    .optional(),
  zipCode: z
    .string()
    .regex(
      /^\d{5}(-\d{4})?$/,
      'Invalid ZIP code (e.g., 94102 or 94102-1234)',
    )
    .or(z.literal(''))
    .optional(),
  emergencyContactName: z
    .string()
    .max(100, 'Too long')
    .or(z.literal(''))
    .optional(),
  emergencyContactPhone: z
    .string()
    .refine(isValidUSPhone, 'Emergency phone must be a valid US number')
    .optional(),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

// PATCH /staff/:id/background-check.
// PO QA #46: simplified to status + approved. The service nulls out
// approved on PENDING / CANCELLED, so the frontend doesn't have to.
export const updateBackgroundCheckSchema = z.object({
  status: z.enum(BACKGROUND_CHECK_STATUSES),
  approved: z.boolean().optional(),
});
export type UpdateBackgroundCheckFormData = z.infer<
  typeof updateBackgroundCheckSchema
>;

// PATCH /staff/:id/cpr. PO QA #49: status + date + expiry + provider
// + notes. Service enforces (ACTIVE → expiry future, EXPIRED → expiry
// past, PENDING/CANCELLED → no expiry constraint).
export const updateCprSchema = z.object({
  status: z.enum(CPR_STATUSES),
  certificationDate: z.string().or(z.literal('')).optional(),
  expiryDate: z.string().or(z.literal('')).optional(),
  provider: z.string().max(100, 'Too long').or(z.literal('')).optional(),
  notes: z.string().max(1000, 'Too long').or(z.literal('')).optional(),
});
export type UpdateCprFormData = z.infer<typeof updateCprSchema>;
