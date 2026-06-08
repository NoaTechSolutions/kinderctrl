export type Locale = 'en' | 'es';

export const translations = {
  en: {
    // Locale meta
    code: 'en',
    label: 'English (US)',
    short: 'EN',
    flag: '🇺🇸',
    language: 'Language',

    // Login
    welcome: 'Welcome back',
    subtitle: 'Sign in to continue.',
    email: 'Email',
    emailPh: 'you@email.com',
    password: 'Password',
    passwordPh: 'Enter your password',
    show: 'Show',
    hide: 'Hide',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    welcomeBack: '✓ Welcome back!',
    or: 'or',
    create: 'Create new account',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    err: 'Invalid email or password.',
    errHint: 'Check your details or reset your password.',
    // Forgot / reset password flow (en).
    forgotTitle: 'Forgot your password?',
    forgotSubtitle:
      "Enter your account email and we'll send you a link to reset it.",
    forgotSubmit: 'Send reset link',
    forgotSending: 'Sending…',
    forgotBackToLogin: 'Back to sign in',
    forgotSentTitle: 'Check your email',
    forgotSentBody:
      "If an account exists for that email, we've sent a password reset link. It expires in 1 hour.",
    resetTitle: 'Choose a new password',
    resetSubtitle:
      'Your new password must be at least 8 characters and include uppercase, lowercase, and a number or symbol.',
    resetNewPassword: 'New password',
    resetSubmit: 'Reset password',
    resetSubmitting: 'Resetting…',
    resetTokenInvalid:
      'This reset link is invalid or has expired. Please request a new one.',
    resetDoneTitle: 'Password reset',
    resetDoneBody:
      'Your password has been updated. Redirecting you to sign in…',
    resetGoToLogin: 'Sign in now',

    errAccountNotActive:
      'Your account is not active. Please contact your administrator.',
    errAccountLocked:
      'Account temporarily locked due to too many failed attempts. Try again in about {minutes} minute(s).',
    errRateLimited:
      'Too many attempts. Try again in about {minutes} minute(s).',
    errRateLimitedShort: 'Please wait before trying again.',
    errEmailExists: 'This email is already registered.',
    errGeneric: 'Something went wrong. Please try again.',
    noAccount: "Don't have an account?",
    requestDemo: 'Request a demo →',

    // Brand / hero side
    forFamilies: 'FOR DIRECTORS, STAFF AND FAMILIES',
    heroA: 'Total control.',
    heroB: 'Complete peace.',
    heroP: 'The all-in-one platform to run your daycare: attendance, daily reports, family communication and billing — all in one place.',
    todayInSteps: 'TODAY AT LITTLE STEPS',
    live: 'live',
    daycare: 'DAYCARES · SaaS',

    // Signup
    heading: 'Create your account',
    sub: 'Join us in minutes.',
    confirmPassword: 'Confirm password',
    confirmPh: 'Repeat password',
    confirmErr: "Passwords don't match.",
    firstName: 'First name (optional)',
    firstNamePh: 'John',
    lastName: 'Last name (optional)',
    lastNamePh: 'Doe',
    roleLabel: 'I am a…',
    roleDirector: 'Director',
    roleStaff: 'Staff',
    roleParent: 'Parent',
    strengthWeak: 'Weak',
    strengthMed: 'Medium',
    strengthStrong: 'Strong',
    reqLength: 'At least 8 characters',
    reqUpper: 'One uppercase letter',
    reqNumber: 'One number',
    createAccount: 'Create account',
    creating: 'Creating account…',
    hasAccount: 'Already have an account?',
    signInLink: 'Sign in',
    emailExists: 'Email already exists.',

    // Centers (nested namespace, accessed via t('centers.title') etc.)
    centers: {
      title: 'Centers',
      titleSingular: 'Center',
      create: 'Create center',
      edit: 'Edit center',
      delete: 'Close center',
      view: 'View details',
      list: 'All centers',
      noCenters: 'No centers yet',
      createFirst: 'Create your first center to get started',
      noCenterAssigned: 'No center assigned',
      contactAdmin:
        "You don't have a center assigned yet. Please contact your daycare administrator.",

      name: 'Center name',
      namePlaceholder: 'e.g., Sunny Days Daycare',
      street: 'Street',
      streetPlaceholder: '123 Main Street',
      city: 'City',
      cityPlaceholder: 'San Francisco',
      state: 'State',
      statePlaceholder: 'CA',
      zipCode: 'ZIP code',
      zipCodePlaceholder: '94102',
      phone: 'Phone',
      phonePlaceholder: '(415) 555-1234',
      email: 'Email',
      emailPlaceholder: 'contact@center.com',
      website: 'Website (optional)',
      websitePlaceholder: 'https://www.example.com',
      capacity: 'Maximum capacity',
      capacityPlaceholder: 'Maximum children',
      timezone: 'Timezone',
      timezoneAutoDetected: 'Auto-detected from ZIP',
      licenseNumber: 'License number (optional)',
      licenseNumberPlaceholder: '073409566',
      fieldRequired: 'required',

      save: 'Save center',
      saving: 'Saving…',
      cancel: 'Cancel',
      noChangesHint: 'No changes to save',
      confirmDelete: 'Close {name}?',
      deleteWarning:
        'This center will be marked as CLOSED. Children with active enrollment must be withdrawn first.',

      adminActions: 'Admin actions',
      changeStatus: 'Change status',
      currentStatus: 'Current',
      confirmStatusChange: 'Change status?',
      confirmStatusChangeDescription:
        'Status will go from "{from}" to "{to}". This may affect access for staff and parents.',
      confirmStatusChangeBtn: 'Change status',
      statusChangedToast: 'Status updated',
      statusChangeError: 'Could not change status',
      deletedToast: 'Center closed',

      createSuccess: 'Center created',
      updateSuccess: 'Center updated',
      deleteSuccess: 'Center closed',
      createdToast: 'Center created successfully',
      updatedToast: 'Changes saved successfully',
      unsavedChangesPrompt:
        'You have unsaved changes. Are you sure you want to leave?',
      createError: 'Could not create center',
      updateError: 'Could not update center',
      deleteError: 'Could not close center',
      loadError: 'Could not load centers',
      notFound: 'Center not found',

      statusAll: 'All',
      statusSetupPending: 'Setup',
      statusActive: 'Active',
      statusSuspended: 'Susp.',
      statusClosed: 'Closed',
    },

    // Staff (nested namespace, accessed via t('staff.title') etc.)
    staff: {
      title: 'Staff',
      titleSingular: 'Staff member',
      create: 'Add staff member',
      edit: 'Edit staff member',
      delete: 'Remove staff member',
      view: 'View details',
      list: 'All staff',
      noStaff: 'No staff members yet',
      createFirst: 'Add your first staff member to get started',
      // Search-specific empty state — distinct from `noStaff` so a query
      // with zero matches doesn't read as "this center has no staff". The
      // term is interpolated inline at the call site.
      noStaffFound: 'No staff found for',

      firstName: 'First name',
      firstNamePlaceholder: 'e.g., Maria',
      lastName: 'Last name',
      lastNamePlaceholder: 'e.g., Gonzalez',
      email: 'Email',
      emailPlaceholder: 'maria@daycare.com',
      phone: 'Phone',
      phonePlaceholder: '(415) 555-1234',
      role: 'Role',
      center: 'Center',
      hireDate: 'Hire date',
      employmentType: 'Employment type',
      hourlyRate: 'Hourly Rate ($/hour)',
      hourlyRatePlaceholder: '25.00',
      notes: 'Notes',
      notesPlaceholder: 'Additional information…',
      status: 'Status',
      fieldRequired: 'Required field',

      roleTeacher: 'Teacher',
      roleAssistant: 'Assistant',
      // "Center Admin" disambiguates from the auth-level SUPER_ADMIN role.
      roleAdmin: 'Center Admin',

      employmentFullTime: 'Full-time',
      employmentPartTime: 'Part-time',

      statusInvited: 'Invited',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusTerminated: 'Terminated',

      cancel: 'Cancel',
      save: 'Save changes',
      saving: 'Saving…',
      noChangesHint: 'No changes to save',
      unsavedChangesPrompt:
        'You have unsaved changes. Are you sure you want to leave?',
      // PO QA #51: titles + action labels for the branded ConfirmDialog
      // that replaces window.confirm(). The prompt above stays the body.
      discardChangesTitle: 'Discard unsaved changes?',
      discardChangesAction: 'Discard',
      keepEditing: 'Keep editing',
      pendingRevokeTitle: 'Revoke invitation?',

      createdToast: 'Staff member added',
      updatedToast: 'Staff member updated',
      updatedAndSetupSentToast:
        'Staff updated. Setup email sent to the new address.',
      deletedToast: 'Staff member removed',
      // PO QA #61: filter dropdown next to the search input.
      filterButton: 'Filter',
      filterStatus: 'Filter by status',
      filterRole: 'Filter by role',
      filterClear: 'Clear filters',
      loadError: 'Could not load staff',
      notFound: 'Staff member not found',
      createError: 'Could not add staff member',
      updateError: 'Could not update staff member',
      // PO QA #45: SUPER_ADMIN editable email + center + extended
      // compliance section in /staff/[id]/edit.
      emailEditWarn:
        'Changing email revokes all sessions and emails a setup link to the new address.',
      // PO QA #54: DIRECTOR sees this hint; SUPER_ADMIN sees emailEditWarn.
      // Wording nudges the Director toward the escalation path instead of
      // dead-ending at "cannot be changed".
      emailReadOnly: 'Contact a Super Admin to change the email',
      // PO QA #54: shown when a DIRECTOR navigates to a staff in another
      // center — backend 403s, the page redirects to /staff with this toast.
      accessDeniedToast:
        "You don't have access to that staff member's record.",
      centerReassignHint:
        'Picking a different center reassigns the staff to that center.',
      cprNotesPh: 'e.g., Re-certification due Feb 2027',
      // PO QA #46: BG simplified to Status (Pending/Completed/Cancelled)
      // + Approved (boolean visible only when Completed). The previous
      // Verifier/Date/Notes/Expiry keys are gone.
      bgCompletedHintEdit:
        'Sets status to Completed. Toggle the Approved checkbox for the outcome.',
      bgApprovedLabel: 'Approved',
      bgApprovedHint:
        'The check came back clean. Leave unchecked if the result was unfavorable.',
      emailChangeConfirmTitle: 'Change staff email?',
      emailChangeConfirmBody:
        'Changing the email to {email} will (1) revoke all active sessions, (2) clear the current password, and (3) send a setup-password email to the new address. Continue?',
      emailChangeConfirmButton: 'Change email and notify',
      deleteError: 'Could not remove staff member',

      confirmRemoveTitle: 'Remove staff member?',
      confirmRemoveDescription:
        'This will mark {name} as terminated and disable their account. This action cannot be undone via the UI.',
      confirmRemoveBtn: 'Yes, remove',

      // Position (free-text job title, NOT used for authz — display only).
      position: 'Position',
      positionPlaceholder: 'e.g., Lead Toddler Teacher',

      // Invitation flow (inviter side).
      invite: 'Invite staff',
      inviteSubtitle:
        'Send an invitation email. The invitee picks their own password.',
      invitePlaceholderEmail: 'staff@email.com',
      inviteCenter: 'Center',
      inviteCenterPlaceholder: 'Select a center',
      inviteSend: 'Send invitation',
      inviteSending: 'Sending…',
      inviteSuccess: 'Invitation sent to {email}',
      inviteError: 'Could not send invitation',
      inviteEmailExists: 'This email is already registered.',
      inviteThrottled:
        'Too many invitations for this email. Try again in about {minutes} minute(s).',

      // Accept-invitation flow (invitee side, public).
      acceptTitle: 'Complete your registration',
      acceptSubtitle: 'You were invited to join {center}.',
      acceptInvitedBy: 'Invited by {name}',
      acceptAgreeTerms: 'I agree to the terms and conditions',
      acceptSubmit: 'Complete registration',
      acceptSubmitting: 'Creating your account…',
      acceptSuccessTitle: 'Welcome to KinderCtrl',
      acceptSuccessBody: 'Your account is ready.',
      // PO QA #55 (FEATURE 6): countdown copy + "Go now" button.
      // `{seconds}` is replaced client-side with the live counter.
      acceptCountdown:
        'Redirecting to your dashboard in {seconds} seconds…',
      acceptGoNow: 'Go now',
      acceptInvalidTitle: 'Invitation no longer valid',
      acceptInvalidBody:
        'This invitation link may have expired or already been used. Ask your director to send a new one.',
      acceptConflict:
        'This email is already registered. Contact your director if you need help.',

      // Compliance — section labels + status copy.
      complianceTitle: 'Compliance',
      // Staff detail view sections (PO QA #26).
      detailPersonal: 'Personal Information',
      detailAddress: 'Address',
      detailEmergency: 'Emergency Contact',
      detailEmployment: 'Employment Information',
      detailFullName: 'Full Name',
      detailStreet: 'Street',
      detailCity: 'City',
      detailState: 'State',
      detailZip: 'Zip Code',
      detailNoAddress: 'No address on file',
      detailNoEmergency: 'No emergency contact on file',
      detailContactName: 'Name',
      detailContactPhone: 'Phone',
      // Inline compliance rows merged into Employment card (PO QA #27).
      // Binary ✅/❌ per spec — EXPIRED collapses to "Not Completed" with
      // a known information loss (PO override of QA #26 pushback).
      detailBgLabel: 'Background Check',
      detailCprLabel: 'CPR Certification',
      detailCompComplete: 'Completed',
      detailCompNotComplete: 'Not Completed',
      // PO QA #28 Opción F: invite-modal pre-fill section + admin reset.
      invitePrefillToggle: 'Pre-fill operational data (optional)',
      invitePrefillHint:
        'These fields are merged into the staff record when the invitee accepts. Skip them to let the staff fill in their own details later.',
      invitePrefillPositionPh: 'Lead Toddler Teacher',
      invitePrefillSelectPh: 'Select…',
      // PO QA #36 Opción C: per-card edit dialog titles.
      editPersonal: 'Edit Personal Information',
      editAddress: 'Edit Address',
      editEmergency: 'Edit Emergency Contacts',
      editEmployment: 'Edit Employment',
      // PO QA #41: short tab label inside the Employment Information
      // card (the full label "Employment Type" is too verbose for a tab).
      detailEmploymentTabShort: 'Employment',
      // PO QA #43: short CPR tab label (kept for the card tabs).
      detailCprTabShort: 'CPR',
      sendResetButton: 'Send Password Reset',
      sendResetConfirmTitle: 'Send password reset email?',
      sendResetConfirmBody:
        '{email} will receive an email with a link to set a new password. The current password will keep working until they use the link.',
      sendResetSuccess: 'Reset email sent to {email}',
      sendResetError: 'Could not send reset email',
      sendResetNotAccepted:
        'This staff has not accepted their invitation yet — resend the invitation instead.',
      // PO QA #29 Opción F++: SUPER_ADMIN-only full-page create entry.
      // Same backend as the modal invitation; the framing is a UX hint.
      adminCreateButton: 'Create Staff',
      adminCreateTitle: 'Create Staff',
      adminCreateSubtitle:
        'Send an invitation with operational data pre-filled. The staff member sets their own password when they accept.',
      // PO QA #30 Opción E: full manual create. Subtitle clarifies that
      // the staff record exists immediately and the new user gets a
      // welcome email to set their own password.
      adminCreateSubtitleE:
        'The staff member is added to your roster immediately and receives an email to set their own password. You can pre-assign them to a classroom while they complete setup.',
      adminCreatedToast: 'Staff created — welcome email sent',
      // Welcome variant of the reset-password page copy (PO QA #30).
      // Triggered by ?welcome=1 in the URL.
      welcomeSetTitle: 'Welcome — set your password',
      welcomeSetSubtitle:
        'Your manager set up your KinderCtrl account. Choose a password to finish setup.',
      welcomeSetButton: 'Set password',
      welcomeSetSuccess: 'Password set — taking you to login…',
      // PO QA #31 — Address + Emergency Contact sections on the SUPER_ADMIN
      // create form. Section titles + relationship select options.
      addressSection: 'Address',
      addressStreetPh: '123 Main Street',
      addressCityPh: 'San Francisco',
      emergencyContact1Section: 'Emergency Contact',
      emergencyContact2Section: 'Emergency Contact (Secondary)',
      // Unified card title + per-subsection headings (PO QA #32).
      emergencyContactSection: 'Emergency Contacts',
      emergencyPrimaryHeading: 'Primary',
      emergencySecondaryHeading: 'Secondary',
      emergencyName: 'Name',
      emergencyNamePh: 'Jane Doe',
      emergencyPhone: 'Phone',
      emergencyRelationship: 'Relationship',
      emergencyRelationshipPh: 'Select relationship…',
      relFather: 'Father',
      relMother: 'Mother',
      relSpouse: 'Spouse',
      relPartner: 'Partner',
      relSibling: 'Sibling',
      relFriend: 'Friend',
      relOther: 'Other',
      complianceLoading: 'Loading…',
      backgroundCheckLabel: 'Background check',
      cprLabel: 'CPR / First Aid',
      bgStatus: 'Status',
      bgEditTitle: 'Update background check',
      bgEditDescription:
        'Set status, verification date, expiry and notes. Changes are recorded with your user as the verifier.',
      bgSave: 'Save background check',
      bgSaved: 'Background check updated',
      bgSaveError: 'Could not update background check',
      // Status copy.
      // PO QA #46 — 3 lifecycle states + a derived "Completed not
      // approved" status used only by the StaffComplianceStatus badge
      // (the rest of the UI reads status + approved separately).
      bgStatusPending: 'Pending',
      bgStatusCompleted: 'Completed',
      bgStatusCancelled: 'Cancelled',
      bgStatusCompletedNotApproved: 'Completed — not approved',

      cprCertified: 'Certified',
      cprCertificationDate: 'Certification date',
      cprExpiryDate: 'Expiry date',
      cprProvider: 'Provider',
      cprProviderPlaceholder: 'e.g., Red Cross, AHA',
      cprNotes: 'Notes',
      cprEditTitle: 'Update CPR certification',
      cprEditDescription:
        'Set certification status, dates, provider and notes. Changes are recorded with your user as the verifier.',
      cprSave: 'Save CPR certification',
      cprSaved: 'CPR certification updated',
      cprSaveError: 'Could not update CPR certification',
      // PO QA #49 — 4-state CPR model. Mirror of BG lifecycle:
      //   Pending   → newly hired / cert not validated yet (default)
      //   Active    → cert in force (future expiry required)
      //   Expired   → cert lapsed (past expiry required)
      //   Cancelled → cert revoked / no longer applicable
      // PO QA #55 (ISSUE 1): generic label for the CPR Status dropdown
      // — was rendering raw 'staff.cprStatus' because the key didn't
      // exist. Mirrors `bgStatus` above.
      cprStatus: 'Status',
      cprStatusPending: 'Pending',
      cprStatusActive: 'Active',
      cprStatusExpired: 'Expired',
      cprStatusCancelled: 'Cancelled',
      // Hints under the conditional Expiry field on the CPR edit form.
      cprExpiryHintActive: 'Required — must be a future date.',
      cprExpiryHintExpired: 'Required — must be a past date.',

      // Generic.
      complianceUnknown: '—',
      addManually: 'New Staff',
      colEmailName: 'User',

      // Pending invitations panel (PO QA #12 3A).
      pendingTitle: 'Pending invitations',
      pendingInvitedBy: 'Invited by {name}',
      pendingExpiresIn: 'Expires in {days} day(s)',
      pendingActions: 'Invitation actions',
      pendingResend: 'Resend invitation',
      pendingResendSuccess: 'Invitation resent to {email}',
      pendingResendError: 'Could not resend invitation',
      // PO QA #14 AJUSTE 3 + #15: resend rate limit labels. While the
      // user still has resend attempts left, show how many remain. Once
      // they hit the limit, swap to a live countdown (formatted MM:SS by
      // the component) that updates every second until the bucket resets.
      pendingResendRemaining: 'Resend ({remaining} left this hour)',
      pendingResendAvailableIn: 'Available in {time}',
      // Generic "Actions" header for tables in the staff namespace.
      colActions: 'Actions',
      pendingRevoke: 'Revoke',
      pendingRevokeConfirm:
        'Revoke the invitation to {email}? The link in the previous email will stop working.',
      pendingRevokeSuccess: 'Invitation revoked',
      pendingRevokeError: 'Could not revoke invitation',
      // Dedicated invitations management page (PO QA #13).
      invManageTitle: 'Manage Invitations',
      invManageSubtitle:
        'Track every invitation you have sent — pending, accepted, expired, or cancelled.',
      invSendButton: 'Send Invitation',
      invFilterAll: 'All',
      invFilterAria: 'Filter invitations by status',
      invStatusPending: 'Pending',
      invStatusAccepted: 'Accepted',
      invStatusExpired: 'Expired',
      invStatusCancelled: 'Cancelled',
      invColCenter: 'Center',
      invColSent: 'Sent',
      invColExpires: 'Expires',
      invColStatus: 'Status',
      invEmpty: 'No invitations to show for this filter.',
      invLoadError: 'Could not load invitations',
      roleHintFixed: 'Currently all staff are teachers',
      bgCompletedLabel: 'Background check completed',
      // PO QA #46: create-form shortcut now sets status=Completed +
      // approved=true under the hood (the boolean shortcut UX is kept).
      bgCompletedHint: 'Mark if the check is complete and approved.',
      cprCompletedLabel: 'CPR certification current',
      cprCompletedHint: 'Mark if CPR certification is current',
      assignToCenter: 'Assign to Center',
      centerDirectorHint:
        "Staff will be managed by the center's director",
      centerSearchPlaceholder: 'Search centers or directors…',
      centerSearchEmpty: 'No centers found',
      dateOfBirth: 'Date of Birth',
      dateOfBirthHint: 'Optional. Staff can complete this later from their profile.',

      // PO QA #8 Opción C — self-service profile (post-invitation onboarding
      // + day-to-day /profile page). Address fields reuse centers.street/city/
      // state/zipCode keys per PO QA #11.
      emergencyContactName: 'Emergency contact',
      emergencyContactNamePlaceholder: 'Full name',
      emergencyContactPhone: 'Emergency phone',
      profileCompleteTitleNamed: 'Welcome to KinderCtrl, {firstName}! 👋',
      profileCompleteTitleFallback: 'Welcome aboard! 👋',
      profileCompleteSubtitle:
        "Let's add a few details to complete your profile",
      profileTitle: 'My profile',
      profileSubtitle: 'Personal details and emergency contact.',
      profileFormTitle: 'Your information',
      profileSave: 'Save profile',
      profileSaving: 'Saving…',
      profileSaved: 'Profile updated',
      profileSaveError: 'Could not update profile',
      profileSkip: 'Skip for now',
      profileBannerTitle: 'Finish your profile',
      profileBannerBody:
        'You skipped some optional details during sign-up. Add them now or any time later.',
      profileBannerCta: 'Complete profile',
    },

    // Admin tools (SUPER_ADMIN only). Accessed via t('admin.*').
    admin: {
      title: 'Admin',
      lockedAccountsNav: 'Locked accounts',
      lockedAccountsTitle: 'Locked accounts',
      lockedAccountsDescription:
        'Users currently locked out by repeated failed login attempts. Unlock to restore access immediately.',
      noLockedAccounts: 'No locked accounts. Nice and quiet.',
      colEmail: 'Email',
      colRole: 'Role',
      colCenter: 'Center',
      colRemaining: 'Lock remaining',
      colLastLogin: 'Last login',
      colActions: 'Actions',
      unlock: 'Unlock',
      // PO QA #51: branded ConfirmDialog title for the unlock action.
      confirmUnlockTitle: 'Unlock account?',
      confirmUnlock:
        'Unlock {email}? This will reset their failed-login counter and grant immediate access. The action is recorded in the audit log.',
      unlockedToast: 'Account unlocked',
      unlockError: 'Could not unlock account',

      // Sidebar SUPER_ADMIN-only "Users" group (per PO QA #7 reorganization).
      usersGroup: 'Users',
      staffNav: 'Staff',
      invitationsNav: 'Invitations',
      directorsNav: 'Directors',
      parentsNav: 'Parents',
      // DIRECTOR-only sidebar Staff group (PO QA #14 AJUSTE 2). Sibling
      // labels to the SUPER_ADMIN group so dark-mode + active-state styles
      // stay symmetric.
      staffGroup: 'Staff',
      staffAllNav: 'All Staff',
      staffInvitationsNav: 'Invitations',

      // Placeholder pages for Directors + Parents under /admin/.
      directorsTitle: 'Directors',
      directorsSubtitle: 'Manage director accounts across all centers.',
      directorsComingSoonTitle: 'Director management coming soon',
      directorsComingSoonBody:
        "We're building cross-center director administration. Until then, directors are managed implicitly via center ownership.",
      parentsTitle: 'Parents',
      parentsSubtitle: 'Manage parent accounts across all centers.',
      parentsComingSoonTitle: 'Parent management coming soon',
      parentsComingSoonBody:
        "Cross-center parent administration is on the roadmap. For now, parents are managed by each center's director.",
    },

    setup: {
      // First-time onboarding welcome (on /centers/new when DIRECTOR has 0 centers)
      welcomeTitle: '🎉 Welcome to KinderCtrl!',
      welcomeDescription:
        'Set up your first center to access the rest of the app.',

      // Banner on center detail page
      pendingTitle: 'Setup pending — finish onboarding',
      pendingDescription:
        'Set your operating hours below to activate this center and unlock all features.',
      pendingCta: 'Set hours now',

      // Hours form
      hoursFormTitle: 'Set operating hours',
      hoursTriggerButton: 'Set Hours',
      editHoursTrigger: 'Edit Hours',
      hoursFormHelp:
        'Pick the days you are open and set the time range. Saving the hours will mark this center as Active.',
      hoursFormSubmit: 'Save hours and activate',
      hoursFormSaving: 'Saving…',
      hoursFormSaved: 'Saved',
      hoursSavedToast: 'Operating hours saved successfully',
      hoursDiscardTitle: 'Discard changes?',
      hoursDiscardDescription:
        'You have unsaved changes. Are you sure you want to leave?',
      hoursDiscardConfirm: 'Discard changes',
      hoursDiscardCancel: 'Keep editing',
      hoursFormError: 'Could not save hours',

      day_sunday: 'Sunday',
      day_monday: 'Monday',
      day_tuesday: 'Tuesday',
      day_wednesday: 'Wednesday',
      day_thursday: 'Thursday',
      day_friday: 'Friday',
      day_saturday: 'Saturday',
      dayClosed: 'Closed',

      errOneDayMin: 'Pick at least one open day.',
      errOpenBeforeClose: '{day}: opening time must be before closing time.',

      // Dashboard banner
      dashboardNoCenterTitle: 'No center yet',
      dashboardNoCenterDescription:
        'Create your first center to start managing children, staff and billing.',
      dashboardCreateCenter: 'Create center',
      dashboardCompleteTitle: 'Complete your setup',
      dashboardCompleteDescription:
        'Set operating hours for {name} to unlock all features.',
      dashboardContinue: 'Continue setup',
    },

    // Issue #6 — /profile module. Unified self-service profile across
    // SUPER_ADMIN / DIRECTOR / STAFF (PARENT later). Reuses
    // staff.discardChangesTitle / staff.keepEditing for the in-modal
    // unsaved-changes prompts.
    profile: {
      pageTitle: 'My profile',
      pageSubtitle: 'Update your personal information and security settings.',
      notSet: 'Not set',
      edit: 'Edit',
      save: 'Save',

      // Personal info card
      personalInfoTitle: 'Personal information',
      personalInfoEditTitle: 'Edit personal information',
      personalInfoEditSubtitle:
        'Update how your name and phone number appear across KinderCtrl.',
      fullName: 'Full name',
      firstName: 'First name',
      firstNamePlaceholder: 'John',
      lastName: 'Last name',
      lastNamePlaceholder: 'Doe',
      phone: 'Phone',
      savedToast: 'Profile updated.',
      saveError: 'Could not update profile. Please try again.',

      // Security card — email + password
      securityTitle: 'Security',
      email: 'Email',
      password: 'Password',

      // Change email modal
      changeEmail: 'Change email',
      changeEmailTitle: 'Change email',
      changeEmailSubtitle:
        'Enter your new email and confirm with your current password.',
      currentEmail: 'Current email',
      newEmail: 'New email',
      currentPassword: 'Current password',
      changeEmailConfirmTitle: 'Sign out of all devices?',
      changeEmailConfirmBody:
        'Changing your email will sign you out of every device, including this one. You will need to sign back in with the new email.',
      changeEmailConfirmAction: 'Change email & sign out',
      emailChangedToast: 'Email updated. Please sign in again.',
      emailAlreadyInUse: 'That email is already registered.',
      changeEmailError: 'Could not change email. Please try again.',

      // Change password modal
      changePassword: 'Change password',
      changePasswordTitle: 'Change password',
      changePasswordSubtitle:
        'Enter your current password and choose a new one.',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      passwordHint:
        'At least 8 characters with uppercase, lowercase, and a number or special character.',
      changePasswordConfirmTitle: 'Sign out of all devices?',
      changePasswordConfirmBody:
        'Changing your password will sign you out of every device, including this one. You will need to sign back in with the new password.',
      changePasswordConfirmAction: 'Change password & sign out',
      passwordChangedToast: 'Password updated. Please sign in again.',
      currentPasswordWrong: 'Current password is incorrect.',
      changePasswordError: 'Could not change password. Please try again.',

      // Shared amber warning shown at the top of both modals
      sessionsRevokedWarning:
        'This action will sign you out of every device, including this one.',

      // STAFF-only third card (preserves legacy address/DOB/emergency editor)
      additionalInfoTitle: 'Additional information',

      // v2 — hero card
      memberSince: 'Member since {date}',
      badgeVerified: 'Verified',
      badgeActive: 'Active',
      editProfile: 'Edit profile',

      // v2 — personal info card extension
      role: 'Role',

      // v2 — contact info card
      contactInfoTitle: 'Contact information',
      timezone: 'Timezone',
      timezoneInheritedHint: 'Inherited from {center}. Update on the center settings.',
      language: 'Language',
      languageHint: 'Changes the app language right away.',

      // v2 — center info card
      centerInfoTitle: 'Center',
      centerViewDetails: 'View full details',

      // v2 — emergency contact card
      emergencyContactTitle: 'Emergency contact',
      emergencyContactEmpty: 'No emergency contact on file.',
      emergencyContactEditTitle: 'Edit emergency contact',
      emergencyContactEditSubtitle:
        'This is who we reach out to in an emergency.',
      emergencyContactSavedToast: 'Emergency contact updated.',
      emergencyContactSaveError:
        'Could not save the emergency contact. Please try again.',

      // v2 — preferences card
      preferencesTitle: 'Preferences',
      theme: 'Theme',
      themeHint: 'Light, dark, or follow your system.',
      timeFormat: 'Time format',
      timeFormatHint: '12-hour (2:30 PM) or 24-hour (14:30).',

      // v3 — address fields + inline Change button label
      change: 'Change',
      address: 'Address',
      street: 'Street',
      streetPlaceholder: '123 Main St',
      city: 'City',
      cityPlaceholder: 'San Francisco',
      state: 'State',
      zipCode: 'ZIP code',
      personalInfoEditAddressTitle: 'Address',

      // v4 — Security: Forgot password row inside the security card
      forgotPasswordLabel: 'Forgot password?',
      forgotPasswordHint: "We'll email you a reset link.",

      // v4 — Emergency Contact illustrated empty state
      emergencyContactAdd: 'Add emergency contact',

      // v4 — trust banner at the bottom of /profile
      footerSecurity: 'Your information is secure and encrypted.',

      // v6 — avatar camera overlay (decorative until upload ships)
      changeAvatarSoon: 'Photo upload coming soon',

      // v6 — Emergency Contact dual tabs (card + modal)
      emergencyContact1Tab: 'Emergency Contact 1',
      emergencyContact2Tab: 'Emergency Contact 2',
      // Short variants for the mobile tabs (full text overflows ~375px).
      emergencyContact1Short: 'Contact 1',
      emergencyContact2Short: 'Contact 2',

      // v14 — STAFF-only DOB row label (Personal Info card + modal)
      dateOfBirth: 'Date of birth',
    },

    // Settings module (Fase 1) — role-gated sections. Theme + Time Format
    // moved here from Profile > Preferences (same hooks/persistence).
    settings: {
      pageTitle: 'Settings',
      personalTitle: 'Personal',
      centerTitle: 'Center',
      systemTitle: 'System',
      theme: 'Theme',
      timeFormat: 'Time format',
      comingSoon: 'Coming soon',
    },

    // Children module — i18n (Follow-up B). View layer: list, detail, badge,
    // empty states, table/card. Form keys (wizard + edit) live below.
    children: {
      // pages / headings / actions
      title: 'Children',
      myChildren: 'My Children',
      newChild: 'New Child',
      edit: 'Edit',
      editChild: 'Edit Child',
      back: 'Back',
      // search / list states
      searchPlaceholder: 'Search by name…',
      searchAria: 'Search children',
      noMatchPrefix: 'No children match',
      loadError: 'Could not load children',
      // empty states
      emptyTitle: 'No children yet',
      emptyTitleParent: 'No children',
      emptyBody:
        'Add your first child to start managing enrollment, parents, and medical info.',
      emptyBodyParent:
        "You don't have any children linked to your account yet.",
      // pick-a-center prompts (SA without a center)
      selectCenter: 'Select a center',
      selectCenterManaged:
        'Children are managed per center. Open a center and use its Children tab.',
      selectCenterCreate:
        'Children are created within a center. Choose one first.',
      goToCenters: 'Go to Centers',
      notFound: "Child not found, or you don't have access to it.",
      // table headers + row aria
      colName: 'Name',
      colAge: 'Age',
      colParents: 'Parents',
      colStatus: 'Status',
      viewAria: 'View',
      // age abbreviations (formatAge): "3y 2m" / "8 mo"
      ageYearShort: 'y',
      ageMonthShort: 'm',
      ageMonthsOnlyShort: 'mo',
      // enrollment status badge
      statusPending: 'Pending',
      statusActive: 'Active',
      statusInactive: 'Inactive',
      statusWithdrawn: 'Withdrawn',
      // detail — card sections + rows
      childInformation: 'Child Information',
      medical: 'Medical',
      parentsGuardians: 'Parents & Guardians',
      dateOfBirth: 'Date of birth',
      gender: 'Gender',
      address: 'Address',
      phone: 'Phone',
      admissionDate: 'Admission date',
      firstDayOfCare: 'First day of care',
      noMedical: 'No medical info on file.',
      noContacts: 'No contacts on file.',
      noDevelopment: 'No development info on file.',
      noRoutines: 'No routine info on file.',
      noToilet: 'No toilet info on file.',
      doctor: 'Doctor',
      doctorPhone: 'Doctor phone',
      specialNeeds: 'Special needs',
      medicationAllergies: 'Medication allergies',
      medicalPlan: 'Medical plan',
      yes: 'Yes',
      no: 'No',
      noParentsLinked: 'No parents linked.',
      primary: 'Primary',
      livesWithChild: 'Lives with child',
      // gender labels (MALE | FEMALE | OTHER)
      genderMale: 'Male',
      genderFemale: 'Female',
      genderOther: 'Other',
      // relationship labels (MOTHER | FATHER | GUARDIAN | OTHER)
      relMother: 'Mother',
      relFather: 'Father',
      relGuardian: 'Guardian',
      relOther: 'Other',

      // ── forms: create wizard + edit form ──
      // step titles + progress
      stepChild: 'Child',
      stepParents: 'Parents',
      stepMedical: 'Medical',
      stepReview: 'Review',
      stepXofY: 'Step {n} of 4',
      // card / group titles
      childDetails: 'Child details',
      medicalOptional: 'Medical (optional)',
      childsAddress: "Child's address",
      doctorAddress: 'Doctor address',
      enrollmentStartsAs: 'Enrollment status starts as',
      // field labels
      firstName: 'First name',
      middleName: 'Middle name',
      lastName: 'Last name',
      birthDate: 'Birth date',
      enrollmentStatus: 'Enrollment status',
      fullName: 'Full name',
      email: 'Email',
      relationship: 'Relationship',
      existingParent: 'Existing parent',
      employer: 'Employer',
      workPhone: 'Work phone',
      doctorName: 'Doctor name',
      allergies: 'Allergies',
      medications: 'Medications',
      selectPlaceholder: 'Select…',
      fullNamePlaceholder: 'First and last name',
      // editable list add / remove + placeholders
      add: 'Add',
      removeAria: 'Remove',
      addAllergy: 'Add an allergy…',
      addMedicationAllergy: 'Add a medication allergy…',
      addMedication: 'Add a medication…',
      // parent card
      parentWord: 'Parent',
      newParentBtn: 'New parent',
      linkExisting: 'Link existing',
      change: 'Change',
      removeParentAria: 'Remove parent',
      searchByNameOrEmail: 'Search by name or email…',
      searchExistingParentsAria: 'Search existing parents',
      noMatchingParents: 'No matching parents.',
      primaryContact: 'Primary contact',
      sameAddressAsChild: 'Same address as the child',
      workDetailsOptional: 'Work details (optional)',
      welcomeEmailHint:
        'A welcome email is sent so the parent can set their password.',
      hasSpecialNeeds: 'Has special needs',
      // ── medical: Fase 2 (2A) extended fields ──
      sectionDoctor: 'Doctor',
      sectionDentist: 'Dentist',
      sectionHealth: 'Health',
      sectionPastIllnesses: 'Past illnesses',
      doctorLastExamDate: 'Last exam date',
      isUnderDoctorCare: 'Currently under a doctor’s care',
      prescribedMedicationDetails: 'Prescribed medication (what kind)',
      medicationSideEffects: 'Medication side effects',
      dentistName: 'Dentist name',
      dentistPhone: 'Dentist phone',
      dentistAddress: 'Dentist address',
      dentalPlan: 'Dental plan',
      specialDevices: 'Special devices (glasses, hearing aids, braces…)',
      frequentColds: 'Has frequent colds',
      frequentColdsCount: 'Colds per year',
      otherIllnesses: 'Other illnesses',
      illnessDateAria: 'Date for',
      illnessChickenPox: 'Chicken Pox',
      illnessAsthma: 'Asthma',
      illnessRheumaticFever: 'Rheumatic Fever',
      illnessHayFever: 'Hay Fever',
      illnessDiabetes: 'Diabetes',
      illnessEpilepsy: 'Epilepsy',
      illnessWhoopingCough: 'Whooping Cough',
      illnessMumps: 'Mumps',
      illnessPoliomyelitis: 'Poliomyelitis',
      illnessTenDayMeasles: 'Ten-Day Measles',
      illnessThreeDayMeasles: 'Three-Day Measles',
      // ── contacts: Fase 2 (2A) ──
      contacts: 'Contacts',
      sectionEmergency: 'Emergency contacts',
      sectionAuthorizedPickup: 'Authorized pickup',
      sectionResponsible: 'Person responsible',
      authorizedPickupNote:
        'Child will not be released to anyone not listed here.',
      contactName: 'Name',
      contactAddress: 'Address',
      homePhone: 'Home phone',
      addContact: 'Add contact',
      removeContactAria: 'Remove contact',
      removeContactTitle: 'Remove contact?',
      removeContactDesc:
        'This contact will be removed when you save this tab.',
      saveContacts: 'Save contacts',
      toastContactsSaved: 'Contacts saved.',
      errContactNameRequired: 'Each contact needs a name.',
      // ── development / routines / toilet: Fase 2 (2B) ──
      development: 'Development',
      routines: 'Routines',
      toilet: 'Toilet',
      // Development tab
      walkedAtMonths: 'Walked at (months)',
      talkedAtMonths: 'Talked at (months)',
      toiletTrainedAtMonths: 'Toilet trained at (months)',
      developmentNotes: 'Development notes',
      // Routines tab
      wakeUpTime: 'Wake-up time',
      bedTime: 'Bedtime',
      takesNap: 'Takes a nap',
      napStartTime: 'Nap start',
      napEndTime: 'Nap end',
      diet: 'Diet / restrictions',
      mealTimes: 'Meal times',
      // Toilet tab
      toiletTrained: 'Toilet trained',
      toiletWords: 'Words the child uses',
      toiletHelpLevel: 'Help needed',
      toiletAccidents: 'Accidents (frequency / notes)',
      toiletHelpIndependent: 'Independent',
      toiletHelpNeedsReminders: 'Needs reminders',
      toiletHelpNeedsAssistance: 'Needs assistance',
      toiletHelpFullAssistance: 'Full assistance',
      toiletHelpInDiapers: 'In diapers',
      // saves + toasts (2B)
      saveDevelopment: 'Save development',
      saveRoutines: 'Save routines',
      saveToilet: 'Save toilet',
      toastDevelopmentSaved: 'Development saved',
      toastRoutinesSaved: 'Routines saved',
      toastToiletSaved: 'Toilet saved',
      errNapEndBeforeStart: 'Nap end must be after nap start.',
      // ── detail refactor: unified view+edit ──
      phonePrimaryContactHint: 'Phone of {name}, primary contact',
      syncPhoneTitle: 'Edit primary contact’s phone?',
      syncPhoneDesc: 'This will edit {name}’s phone, the primary contact. Continue?',
      confirm: 'Confirm',
      alertBadgeHint: 'On file',
      medicalConditionsLabel: 'Medical conditions',
      allergiesMedications: 'Allergies & medications',
      badgeAllergies: 'Allergies',
      badgeSpecialCare: 'Special care',
      addMedicalCondition: 'Add condition',
      insuranceCard: 'Insurance',
      insuranceProvider: 'Insurance provider',
      insurancePolicy: 'Policy number',
      // ── Fase 2 (2C): personality + permissions ──
      personality: 'Personality',
      permissions: 'Permissions',
      persLikes: 'Likes & preferences',
      persBehavior: 'Behavior & social',
      persNotes: 'Notes',
      personalityWords: 'Five words that describe them',
      likesToDo: 'Likes to do',
      favoriteFoods: 'Favorite foods',
      dislikedFoods: 'Disliked foods',
      fears: 'Fears',
      favoriteIndoorActivity: 'Favorite indoor activity',
      favoriteOutdoorActivity: 'Favorite outdoor activity',
      favoriteToy: 'Favorite toy',
      napsAtHome: 'Naps at home',
      napTimeAtHome: 'Nap time at home',
      expressesEmotions: 'How they express emotions',
      homeDiscipline: 'Discipline at home',
      getsAlongWith: 'Gets along with (parents / siblings / others)',
      groupPlayExperience: 'Group play experience',
      sickCarePlan: 'Care plan when sick',
      transitionTips: 'Tips for a positive transition',
      anythingElse: 'Anything else to share',
      commaHint: 'Separate with commas',
      consentApproved: 'Approved',
      consentNotApproved: 'Not approved',
      consentWaterPlay: 'Water play',
      consentPhotoInternal: 'Photos — internal use',
      consentPhotoMarketing: 'Photos — marketing',
      consentSunscreen: 'Sunscreen / insect repellent',
      consentEmergencyMedical: 'Emergency medical treatment',
      consentEmergencyTransport: 'Emergency transport',
      sunscreenProducts: 'Product names',
      sunscreenInstructions: 'Instructions',
      sunscreenDates: 'Valid dates',
      sunscreenStartDate: 'Start date',
      sunscreenEndDate: 'End date',
      signedBy: 'Registered by {name} on {date}',
      unknownUser: 'a staff member',
      // ── Fase 2 (2D): infant sleep + gaps ──
      infantSleep: 'Infant sleep',
      infantOnlyNote: 'Only applies to infants (under 12 months).',
      noInfantSleep: 'No infant sleep info on file.',
      sleepLocation: 'Sleeps in',
      sleepLocationOther: 'Other (specify)',
      sleepCrib: 'Crib',
      sleepPlayYard: 'Play yard',
      sleepOther: 'Other',
      usualSleepHours: 'Usual sleep hours',
      averageNapDuration: 'Average nap duration',
      usesPacifier: 'Uses a pacifier',
      pacifierYes: 'Yes',
      pacifierNo: 'No',
      pacifierSometimes: 'Sometimes',
      pacifierBrand: 'Pacifier brand',
      canRollOver: 'Can roll over',
      rollOverDate: 'Started rolling over on',
      providerObservedRoll: 'Provider observed rolling',
      medicalExemption: 'Medical sleep-position exemption',
      medicalExemptionInstructions: "Doctor's instructions",
      unanswered: 'Unanswered',
      sleepsWell: 'Sleeps well',
      eatingProblems: 'Eating problems',
      toiletWordBowel: 'Word for bowel movement',
      toiletWordUrination: 'Word for urination',
      bowelMovementsRegular: 'Regular bowel movements',
      bowelMovementTime: 'Usual time',
      reasonForCare: 'Reason for requesting care',
      lastEnrollmentDate: 'Last enrollment date',
      addAnotherParent: 'Add another parent',
      addParent: 'Add parent',
      // nav buttons
      cancel: 'Cancel',
      previous: 'Previous',
      next: 'Next',
      createChild: 'Create child',
      // review-only labels / values
      type: 'Type',
      homeAddress: 'Home address',
      workAddress: 'Work address',
      sameAsChild: 'Same as child',
      editChildAria: 'Edit child',
      editParentsAria: 'Edit parents',
      editMedicalAria: 'Edit medical',
      // toasts
      toastCreated: 'Child created',
      toastCreateFailed: 'Failed to create child',
      toastDetailsSaved: 'Child details saved',
      toastMedicalSaved: 'Medical info saved',
      toastParentsSaved: 'Parents saved',
      toastSaveFailed: 'Failed to save changes',
      // dialogs
      removeParentTitle: 'Remove this parent?',
      removeParentDescWizard:
        'This parent has details entered. Removing the card discards them.',
      removeParentDescEdit:
        'The parent record itself is kept — only the link to this child is removed (on save).',
      createTitle: 'Create this child?',
      createDescription: 'Create this child with the information you entered?',
      create: 'Create',
      saveChangesTitle: 'Save changes?',
      saveChangesDesc: 'Apply the changes to this section?',
      unsavedTitle: 'Unsaved changes',
      unsavedTabDesc:
        'You have unsaved changes in this section. Save before continuing?',
      discard: 'Discard',
      saveAndContinue: 'Save and continue',
      save: 'Save',
      remove: 'Remove',
      saveDetails: 'Save details',
      saveParents: 'Save parents',
      saveMedical: 'Save medical',
      editSectionsAria: 'Edit sections',
      // leave guards
      unsavedLeaveWizard:
        'You have unsaved changes. Leaving will discard the information entered.',
      unsavedLeaveEdit: 'You have unsaved changes. Leaving will discard them.',
      // validation
      errFirstNameRequired: 'First name is required.',
      errLastNameRequired: 'Last name is required.',
      errBirthDateRequired: 'Birth date is required.',
      errBirthDateFuture: 'Birth date cannot be in the future.',
      errGenderRequired: 'Gender is required.',
      errAtLeastOneParent: 'At least one parent is required.',
      errMarkPrimary: 'Mark one parent as primary.',
      errRelationshipRequired: 'relationship is required.',
      errPickExisting: 'pick an existing parent.',
      errFullNameRequired: 'full name (first and last) is required.',
      errEmailRequired: 'a valid email is required.',
    },

    // v9 — sidebar collapse affordance copy
    sidebar: {
      expand: 'Expand sidebar',
      collapse: 'Collapse sidebar',
      // v13 — used by the K-logo button when the sidebar is currently
      // temp-expanded (collapsed in localStorage but visually showing
      // the expanded layout because the user clicked a group icon).
      // Clicking K commits the temp expansion to permanent.
      pinExpansion: 'Pin sidebar expanded',
    },

    // Shared topbar / sidebar copy. The logout label appears in both
    // the topbar dropdown and the sidebar footer (v9) — kept here so
    // they read identically.
    topbar: {
      logout: 'Logout',
    },
  },
  es: {
    // Locale meta
    code: 'es',
    label: 'Español',
    short: 'ES',
    flag: '🇪🇸',
    language: 'Idioma',

    // Login
    welcome: 'Bienvenido de nuevo',
    subtitle: 'Inicia sesión para continuar.',
    email: 'Email',
    emailPh: 'tu@email.com',
    password: 'Contraseña',
    passwordPh: 'Ingresa tu contraseña',
    show: 'Mostrar',
    hide: 'Ocultar',
    remember: 'Recordarme',
    forgot: '¿Olvidaste tu contraseña?',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión…',
    welcomeBack: '✓ ¡Bienvenida!',
    or: 'o',
    create: 'Crear cuenta nueva',
    terms: 'Términos',
    privacy: 'Política de privacidad',
    err: 'Email o contraseña incorrectos.',
    errHint: 'Comprueba tus datos o restablece la contraseña.',
    noAccount: '¿No tienes cuenta?',
    requestDemo: 'Solicita una demo →',

    // Brand / hero side
    forFamilies: 'PARA DIRECTORES, PERSONAL Y FAMILIAS',
    heroA: 'Control total.',
    heroB: 'Paz completa.',
    heroP: 'La plataforma todo-en-uno para gestionar tu guardería: asistencia, reportes diarios, comunicación con familias y facturación, todo en un solo lugar.',
    todayInSteps: 'HOY EN PEQUEÑOS PASOS',
    live: 'en vivo',
    daycare: 'GUARDERÍAS · SaaS',

    // Signup
    heading: 'Crea tu cuenta',
    sub: 'Únete en minutos.',
    confirmPassword: 'Confirmar contraseña',
    confirmPh: 'Repite tu contraseña',
    confirmErr: 'Las contraseñas no coinciden.',
    firstName: 'Nombre (opcional)',
    firstNamePh: 'Juan',
    lastName: 'Apellido (opcional)',
    lastNamePh: 'Pérez',
    roleLabel: 'Soy…',
    roleDirector: 'Director',
    roleStaff: 'Personal',
    roleParent: 'Padre/Madre',
    strengthWeak: 'Débil',
    strengthMed: 'Media',
    strengthStrong: 'Fuerte',
    reqLength: 'Mínimo 8 caracteres',
    reqUpper: 'Una letra mayúscula',
    reqNumber: 'Un número',
    createAccount: 'Crear cuenta',
    creating: 'Creando cuenta…',
    hasAccount: '¿Ya tienes cuenta?',
    signInLink: 'Inicia sesión',
    emailExists: 'El email ya existe.',
    // Forgot / reset password flow (es).
    forgotTitle: '¿Olvidaste tu contraseña?',
    forgotSubtitle:
      'Ingresá el email de tu cuenta y te mandamos un link para resetearla.',
    forgotSubmit: 'Mandar link de reset',
    forgotSending: 'Enviando…',
    forgotBackToLogin: 'Volver al login',
    forgotSentTitle: 'Revisá tu email',
    forgotSentBody:
      'Si existe una cuenta para ese email, te mandamos un link para resetear la contraseña. El link vence en 1 hora.',
    resetTitle: 'Elegí una nueva contraseña',
    resetSubtitle:
      'Tu nueva contraseña tiene que tener al menos 8 caracteres e incluir mayúscula, minúscula y un número o símbolo.',
    resetNewPassword: 'Nueva contraseña',
    resetSubmit: 'Resetear contraseña',
    resetSubmitting: 'Reseteando…',
    resetTokenInvalid:
      'Este link de reset es inválido o expiró. Pedí uno nuevo.',
    resetDoneTitle: 'Contraseña actualizada',
    resetDoneBody:
      'Tu contraseña se actualizó. Te llevamos al login…',
    resetGoToLogin: 'Iniciar sesión',

    errAccountNotActive:
      'Tu cuenta no está activa. Contactá al administrador.',
    errAccountLocked:
      'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intentá de nuevo en {minutes} minuto(s).',
    errRateLimited:
      'Demasiados intentos. Intentá de nuevo en {minutes} minuto(s).',
    errRateLimitedShort: 'Esperá antes de intentar de nuevo.',
    errEmailExists: 'Este email ya está registrado.',
    errGeneric: 'Algo salió mal. Intentá de nuevo.',

    // Centers (nested namespace)
    centers: {
      title: 'Centros',
      titleSingular: 'Centro',
      create: 'Crear centro',
      edit: 'Editar centro',
      delete: 'Cerrar centro',
      view: 'Ver detalles',
      list: 'Todos los centros',
      noCenters: 'Todavía no hay centros',
      createFirst: 'Crea tu primer centro para comenzar',
      noCenterAssigned: 'Sin centro asignado',
      contactAdmin:
        'Todavía no tenés un centro asignado. Contactá al administrador de tu guardería.',

      name: 'Nombre del centro',
      namePlaceholder: 'ej., Guardería Días Soleados',
      street: 'Calle',
      streetPlaceholder: 'Calle Principal 123',
      city: 'Ciudad',
      cityPlaceholder: 'San Francisco',
      state: 'Estado',
      statePlaceholder: 'CA',
      zipCode: 'Código postal',
      zipCodePlaceholder: '94102',
      phone: 'Teléfono',
      phonePlaceholder: '(415) 555-1234',
      email: 'Email',
      emailPlaceholder: 'contacto@centro.com',
      website: 'Sitio web (opcional)',
      websitePlaceholder: 'https://www.ejemplo.com',
      capacity: 'Capacidad máxima',
      capacityPlaceholder: 'Máximo de niños',
      timezone: 'Zona horaria',
      timezoneAutoDetected: 'Detectado por código postal',
      licenseNumber: 'Número de licencia (opcional)',
      licenseNumberPlaceholder: '073409566',
      fieldRequired: 'obligatorio',

      save: 'Guardar centro',
      saving: 'Guardando…',
      cancel: 'Cancelar',
      noChangesHint: 'No hay cambios para guardar',
      confirmDelete: '¿Cerrar {name}?',
      deleteWarning:
        'Este centro quedará marcado como CERRADO. Los niños activos deben ser dados de baja primero.',

      adminActions: 'Acciones de admin',
      changeStatus: 'Cambiar estado',
      currentStatus: 'Actual',
      confirmStatusChange: '¿Cambiar estado?',
      confirmStatusChangeDescription:
        'El estado pasará de "{from}" a "{to}". Esto puede afectar el acceso del personal y las familias.',
      confirmStatusChangeBtn: 'Cambiar estado',
      statusChangedToast: 'Estado actualizado',
      statusChangeError: 'No se pudo cambiar el estado',
      deletedToast: 'Centro cerrado',

      createSuccess: 'Centro creado',
      updateSuccess: 'Centro actualizado',
      deleteSuccess: 'Centro cerrado',
      createdToast: 'Centro creado correctamente',
      updatedToast: 'Cambios guardados correctamente',
      unsavedChangesPrompt:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',
      createError: 'No se pudo crear el centro',
      updateError: 'No se pudo actualizar el centro',
      deleteError: 'No se pudo cerrar el centro',
      loadError: 'No se pudieron cargar los centros',
      notFound: 'Centro no encontrado',

      statusAll: 'Todos',
      statusSetupPending: 'Config.',
      statusActive: 'Activo',
      statusSuspended: 'Susp.',
      statusClosed: 'Cerrado',
    },

    admin: {
      title: 'Admin',
      lockedAccountsNav: 'Cuentas bloqueadas',
      lockedAccountsTitle: 'Cuentas bloqueadas',
      lockedAccountsDescription:
        'Usuarios bloqueados por demasiados intentos fallidos. Desbloqueá para restaurar el acceso al instante.',
      noLockedAccounts: 'No hay cuentas bloqueadas. Todo tranquilo.',
      colEmail: 'Email',
      colRole: 'Rol',
      colCenter: 'Centro',
      colRemaining: 'Tiempo restante',
      colLastLogin: 'Último login',
      colActions: 'Acciones',
      unlock: 'Desbloquear',
      // PO QA #51: título del ConfirmDialog para unlock.
      confirmUnlockTitle: '¿Desbloquear cuenta?',
      confirmUnlock:
        '¿Desbloquear {email}? Se va a resetear el contador de intentos fallidos y la cuenta podrá entrar al instante. La acción queda registrada en el audit log.',
      unlockedToast: 'Cuenta desbloqueada',
      unlockError: 'No se pudo desbloquear la cuenta',

      usersGroup: 'Usuarios',
      staffNav: 'Personal',
      invitationsNav: 'Invitaciones',
      directorsNav: 'Directores',
      parentsNav: 'Padres',
      // Grupo Staff del DIRECTOR (PO QA #14 AJUSTE 2).
      staffGroup: 'Personal',
      staffAllNav: 'Todo el personal',
      staffInvitationsNav: 'Invitaciones',

      directorsTitle: 'Directores',
      directorsSubtitle:
        'Gestioná cuentas de directores en todos los centros.',
      directorsComingSoonTitle: 'Gestión de directores próximamente',
      directorsComingSoonBody:
        'Estamos construyendo la administración cross-center de directores. Por ahora, los directores se gestionan implícitamente vía center ownership.',
      parentsTitle: 'Padres',
      parentsSubtitle: 'Gestioná cuentas de padres en todos los centros.',
      parentsComingSoonTitle: 'Gestión de padres próximamente',
      parentsComingSoonBody:
        'La administración cross-center de padres está en el roadmap. Por ahora, los padres se gestionan desde el director de cada centro.',
    },

    staff: {
      title: 'Personal',
      titleSingular: 'Empleado',
      create: 'Agregar empleado',
      edit: 'Editar empleado',
      delete: 'Eliminar empleado',
      view: 'Ver detalles',
      list: 'Todo el personal',
      noStaff: 'Aún no hay empleados',
      createFirst: 'Agregá tu primer empleado para empezar',
      noStaffFound: 'No se encontró personal para',

      center: 'Centro',
      firstName: 'Nombre',
      firstNamePlaceholder: 'ej., María',
      lastName: 'Apellido',
      lastNamePlaceholder: 'ej., González',
      email: 'Email',
      emailPlaceholder: 'maria@guarderia.com',
      phone: 'Teléfono',
      phonePlaceholder: '(415) 555-1234',
      role: 'Cargo',
      hireDate: 'Fecha de ingreso',
      employmentType: 'Tipo de contrato',
      hourlyRate: 'Tarifa por hora ($/hora)',
      hourlyRatePlaceholder: '25.00',
      notes: 'Notas',
      notesPlaceholder: 'Información adicional…',
      status: 'Estado',
      fieldRequired: 'Campo obligatorio',

      roleTeacher: 'Profesor/a',
      roleAssistant: 'Asistente',
      roleAdmin: 'Admin del centro',

      employmentFullTime: 'Tiempo completo',
      employmentPartTime: 'Tiempo parcial',

      statusInvited: 'Invitado',
      statusActive: 'Activo',
      statusSuspended: 'Suspendido',
      statusTerminated: 'Terminado',

      cancel: 'Cancelar',
      save: 'Guardar cambios',
      saving: 'Guardando…',
      noChangesHint: 'No hay cambios para guardar',
      unsavedChangesPrompt:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',
      // PO QA #51: títulos y labels para ConfirmDialog.
      discardChangesTitle: '¿Descartar cambios sin guardar?',
      discardChangesAction: 'Descartar',
      keepEditing: 'Seguir editando',
      pendingRevokeTitle: '¿Revocar invitación?',

      createdToast: 'Empleado agregado',
      updatedToast: 'Empleado actualizado',
      updatedAndSetupSentToast:
        'Empleado actualizado. Email de setup enviado al nuevo email.',
      deletedToast: 'Empleado eliminado',
      // PO QA #61: filter dropdown junto al search input.
      filterButton: 'Filtrar',
      filterStatus: 'Filtrar por estado',
      filterRole: 'Filtrar por rol',
      filterClear: 'Limpiar filtros',
      loadError: 'No se pudo cargar el personal',
      notFound: 'Empleado no encontrado',
      createError: 'No se pudo agregar el empleado',
      updateError: 'No se pudo actualizar el empleado',
      // PO QA #45: edits SUPER_ADMIN-only de email y center + sección
      // de compliance ampliada en /staff/[id]/edit.
      emailEditWarn:
        'Cambiar el email cierra todas las sesiones y envía un link de setup al nuevo email.',
      // PO QA #54: DIRECTOR ve este hint; SUPER_ADMIN ve emailEditWarn.
      emailReadOnly: 'Contactá a un Super Admin para cambiar el email',
      // PO QA #54: toast cuando un DIRECTOR cae en staff de otro centro.
      accessDeniedToast:
        'No tenés acceso al registro de ese empleado.',
      centerReassignHint:
        'Elegir un centro distinto reasigna al empleado a ese centro.',
      cprNotesPh: 'ej. Recertificación vence en febrero 2027',
      // PO QA #46: BG simplificado a Status + Approved.
      bgCompletedHintEdit:
        'Pone el estado en Completado. Tildá Aprobado para indicar el resultado.',
      bgApprovedLabel: 'Aprobado',
      bgApprovedHint:
        'El chequeo salió limpio. Desmarcá si el resultado fue desfavorable.',
      emailChangeConfirmTitle: '¿Cambiar email del empleado?',
      emailChangeConfirmBody:
        'Cambiar el email a {email} va a (1) cerrar todas las sesiones activas, (2) borrar la contraseña actual y (3) enviar un email de setup al nuevo email. ¿Continuar?',
      emailChangeConfirmButton: 'Cambiar email y notificar',
      deleteError: 'No se pudo eliminar el empleado',

      confirmRemoveTitle: '¿Eliminar empleado?',
      confirmRemoveDescription:
        'Esto va a marcar a {name} como terminado y deshabilitar su cuenta. Esta acción no se puede deshacer desde la UI.',
      confirmRemoveBtn: 'Sí, eliminar',

      position: 'Puesto',
      positionPlaceholder: 'ej., Profe principal sala bebés',

      invite: 'Invitar empleado',
      inviteSubtitle:
        'Enviá una invitación por email. El invitado elige su propia contraseña.',
      invitePlaceholderEmail: 'empleado@email.com',
      inviteCenter: 'Centro',
      inviteCenterPlaceholder: 'Elegí un centro',
      inviteSend: 'Enviar invitación',
      inviteSending: 'Enviando…',
      inviteSuccess: 'Invitación enviada a {email}',
      inviteError: 'No se pudo enviar la invitación',
      inviteEmailExists: 'Este email ya está registrado.',
      inviteThrottled:
        'Demasiadas invitaciones a este email. Intentá de nuevo en {minutes} minuto(s).',

      acceptTitle: 'Completá tu registro',
      acceptSubtitle: 'Te invitaron a unirte a {center}.',
      acceptInvitedBy: 'Invitado por {name}',
      acceptAgreeTerms: 'Acepto los términos y condiciones',
      acceptSubmit: 'Completar registro',
      acceptSubmitting: 'Creando tu cuenta…',
      acceptSuccessTitle: 'Bienvenido a KinderCtrl',
      acceptSuccessBody: 'Tu cuenta está lista.',
      // PO QA #55: countdown + botón "Ir ahora".
      acceptCountdown:
        'Redirigiendo al dashboard en {seconds} segundos…',
      acceptGoNow: 'Ir ahora',
      acceptInvalidTitle: 'Invitación inválida',
      acceptInvalidBody:
        'Este link puede haber expirado o ya fue usado. Pedile a tu director que te mande uno nuevo.',
      acceptConflict:
        'Este email ya está registrado. Contactá a tu director si necesitás ayuda.',

      complianceTitle: 'Cumplimiento',
      // Secciones del detalle de personal (PO QA #26).
      detailPersonal: 'Información personal',
      detailAddress: 'Dirección',
      detailEmergency: 'Contacto de emergencia',
      detailEmployment: 'Información laboral',
      detailFullName: 'Nombre completo',
      detailStreet: 'Calle',
      detailCity: 'Ciudad',
      detailState: 'Estado',
      detailZip: 'Código postal',
      detailNoAddress: 'Sin dirección registrada',
      detailNoEmergency: 'Sin contacto de emergencia registrado',
      detailContactName: 'Nombre',
      detailContactPhone: 'Teléfono',
      // Filas inline de cumplimiento dentro de Employment (PO QA #27).
      detailBgLabel: 'Antecedentes',
      detailCprLabel: 'Certificación RCP',
      detailCompComplete: 'Completado',
      detailCompNotComplete: 'No completado',
      // Modal de invitación + reset admin (PO QA #28 Opción F).
      invitePrefillToggle: 'Pre-cargar datos operativos (opcional)',
      invitePrefillHint:
        'Estos campos se aplican al staff cuando acepte la invitación. Saltalos si querés que el staff los complete después.',
      invitePrefillPositionPh: 'Profesor Toddler',
      invitePrefillSelectPh: 'Seleccionar…',
      // Títulos de diálogos de edición por card (PO QA #36).
      editPersonal: 'Editar información personal',
      editAddress: 'Editar dirección',
      editEmergency: 'Editar contactos de emergencia',
      editEmployment: 'Editar información laboral',
      // Etiqueta corta para el tab dentro de Employment Information.
      detailEmploymentTabShort: 'Laboral',
      // Label de tab CPR para el card (PO QA #43).
      detailCprTabShort: 'RCP',
      sendResetButton: 'Enviar reset de contraseña',
      sendResetConfirmTitle: '¿Enviar email de reset de contraseña?',
      sendResetConfirmBody:
        '{email} va a recibir un email con un link para crear una nueva contraseña. La contraseña actual sigue funcionando hasta que use el link.',
      sendResetSuccess: 'Email de reset enviado a {email}',
      sendResetError: 'No se pudo enviar el email de reset',
      sendResetNotAccepted:
        'Este staff todavía no aceptó su invitación — reenviá la invitación en su lugar.',
      // Entrada full-page solo para SUPER_ADMIN (PO QA #29 Opción F++).
      adminCreateButton: 'Crear empleado',
      adminCreateTitle: 'Crear empleado',
      adminCreateSubtitle:
        'Envía una invitación con datos operativos pre-cargados. El empleado define su propia contraseña cuando acepta.',
      // Crear empleado manual (PO QA #30 Opción E).
      adminCreateSubtitleE:
        'El empleado se agrega a tu equipo inmediatamente y recibe un email para definir su contraseña. Podés pre-asignarlo a un classroom mientras completa el setup.',
      adminCreatedToast: 'Empleado creado — email de bienvenida enviado',
      // Variante "bienvenida" de la página de reset-password (PO QA #30).
      welcomeSetTitle: 'Bienvenido — definí tu contraseña',
      welcomeSetSubtitle:
        'Tu manager configuró tu cuenta de KinderCtrl. Elegí una contraseña para terminar el setup.',
      welcomeSetButton: 'Definir contraseña',
      welcomeSetSuccess: 'Contraseña definida — llevándote al login…',
      // Secciones de Dirección + Contactos de emergencia (PO QA #31).
      addressSection: 'Dirección',
      addressStreetPh: 'Av. Siempreviva 123',
      addressCityPh: 'Buenos Aires',
      emergencyContact1Section: 'Contacto de emergencia',
      emergencyContact2Section: 'Contacto de emergencia (secundario)',
      // Card unificada + headings (PO QA #32).
      emergencyContactSection: 'Contactos de emergencia',
      emergencyPrimaryHeading: 'Principal',
      emergencySecondaryHeading: 'Secundario',
      emergencyName: 'Nombre',
      emergencyNamePh: 'María Pérez',
      emergencyPhone: 'Teléfono',
      emergencyRelationship: 'Relación',
      emergencyRelationshipPh: 'Seleccionar relación…',
      relFather: 'Padre',
      relMother: 'Madre',
      relSpouse: 'Cónyuge',
      relPartner: 'Pareja',
      relSibling: 'Hermano/a',
      relFriend: 'Amigo/a',
      relOther: 'Otro',
      complianceLoading: 'Cargando…',
      backgroundCheckLabel: 'Antecedentes',
      cprLabel: 'RCP / Primeros auxilios',
      bgStatus: 'Estado',
      bgEditTitle: 'Actualizar antecedentes',
      bgEditDescription:
        'Definí estado, fecha de verificación, vencimiento y notas. Los cambios quedan registrados con tu usuario como verificador.',
      bgSave: 'Guardar antecedentes',
      bgSaved: 'Antecedentes actualizados',
      bgSaveError: 'No se pudo actualizar antecedentes',
      // PO QA #46 — 3 estados + un derivado para el badge.
      bgStatusPending: 'En proceso',
      bgStatusCompleted: 'Completado',
      bgStatusCancelled: 'Cancelado',
      bgStatusCompletedNotApproved: 'Completado — no aprobado',

      cprCertified: 'Certificado',
      cprCertificationDate: 'Fecha de certificación',
      cprExpiryDate: 'Fecha de vencimiento',
      cprProvider: 'Proveedor',
      cprProviderPlaceholder: 'ej., Cruz Roja, AHA',
      cprNotes: 'Notas',
      cprEditTitle: 'Actualizar RCP',
      cprEditDescription:
        'Definí estado, fechas, proveedor y notas. Los cambios quedan registrados con tu usuario como verificador.',
      cprSave: 'Guardar RCP',
      cprSaved: 'RCP actualizada',
      cprSaveError: 'No se pudo actualizar RCP',
      // PO QA #55: label genérico del dropdown CPR Status.
      cprStatus: 'Estado',
      // PO QA #49 — 4 estados CPR.
      cprStatusPending: 'En proceso',
      cprStatusActive: 'Activa',
      cprStatusExpired: 'Vencida',
      cprStatusCancelled: 'Cancelada',
      cprExpiryHintActive: 'Requerido — debe ser una fecha futura.',
      cprExpiryHintExpired: 'Requerido — debe ser una fecha pasada.',

      complianceUnknown: '—',
      addManually: 'Nuevo empleado',
      colEmailName: 'Usuario',

      pendingTitle: 'Invitaciones pendientes',
      pendingInvitedBy: 'Invitado por {name}',
      pendingExpiresIn: 'Expira en {days} día(s)',
      pendingActions: 'Acciones de invitación',
      pendingResend: 'Reenviar invitación',
      pendingResendSuccess: 'Invitación reenviada a {email}',
      pendingResendError: 'No se pudo reenviar la invitación',
      // Etiquetas del rate limit de reenvío (PO QA #14 AJUSTE 3 + #15).
      pendingResendRemaining: 'Reenviar (te quedan {remaining} esta hora)',
      pendingResendAvailableIn: 'Disponible en {time}',
      colActions: 'Acciones',
      pendingRevoke: 'Revocar',
      pendingRevokeConfirm:
        '¿Revocar la invitación a {email}? El link del email anterior dejará de funcionar.',
      pendingRevokeSuccess: 'Invitación revocada',
      pendingRevokeError: 'No se pudo revocar la invitación',
      // Página de gestión de invitaciones (PO QA #13).
      invManageTitle: 'Gestionar invitaciones',
      invManageSubtitle:
        'Hacé seguimiento de cada invitación enviada — pendientes, aceptadas, expiradas o canceladas.',
      invSendButton: 'Enviar invitación',
      invFilterAll: 'Todas',
      invFilterAria: 'Filtrar invitaciones por estado',
      invStatusPending: 'Pendiente',
      invStatusAccepted: 'Aceptada',
      invStatusExpired: 'Expirada',
      invStatusCancelled: 'Cancelada',
      invColCenter: 'Centro',
      invColSent: 'Enviada',
      invColExpires: 'Expira',
      invColStatus: 'Estado',
      invEmpty: 'No hay invitaciones para este filtro.',
      invLoadError: 'No se pudieron cargar las invitaciones',
      roleHintFixed: 'Por ahora todos son profesores',
      bgCompletedLabel: 'Antecedentes verificados',
      // PO QA #46: shortcut de create pone Completed + approved=true.
      bgCompletedHint: 'Marcá si el chequeo está completo y aprobado.',
      cprCompletedLabel: 'Certificación RCP vigente',
      cprCompletedHint: 'Marcá si la certificación RCP está vigente',
      assignToCenter: 'Asignar a Centro',
      centerDirectorHint:
        'El staff queda gestionado por el director del centro',
      centerSearchPlaceholder: 'Buscar centros o directores…',
      centerSearchEmpty: 'No se encontraron centros',
      dateOfBirth: 'Fecha de nacimiento',
      dateOfBirthHint:
        'Opcional. El staff puede completarlo después desde su perfil.',

      emergencyContactName: 'Contacto de emergencia',
      emergencyContactNamePlaceholder: 'Nombre completo',
      emergencyContactPhone: 'Teléfono de emergencia',
      profileCompleteTitleNamed: '¡Bienvenido a KinderCtrl, {firstName}! 👋',
      profileCompleteTitleFallback: '¡Bienvenido al equipo! 👋',
      profileCompleteSubtitle:
        'Agregá algunos detalles para completar tu perfil',
      profileTitle: 'Mi perfil',
      profileSubtitle: 'Datos personales y contacto de emergencia.',
      profileFormTitle: 'Tus datos',
      profileSave: 'Guardar perfil',
      profileSaving: 'Guardando…',
      profileSaved: 'Perfil actualizado',
      profileSaveError: 'No se pudo actualizar el perfil',
      profileSkip: 'Saltear por ahora',
      profileBannerTitle: 'Completá tu perfil',
      profileBannerBody:
        'Salteaste algunos detalles opcionales durante el alta. Agregalos ahora o cuando quieras.',
      profileBannerCta: 'Completar perfil',
    },

    setup: {
      // Bienvenida primer-uso (en /centers/new cuando DIRECTOR tiene 0 centros)
      welcomeTitle: '🎉 ¡Bienvenido a KinderCtrl!',
      welcomeDescription:
        'Configura tu primer centro para acceder al resto de la aplicación.',

      // Banner en detalle de centro
      pendingTitle: 'Configuración pendiente — termina el alta',
      pendingDescription:
        'Configura los horarios de operación más abajo para activar este centro y desbloquear todas las funciones.',
      pendingCta: 'Configurar horarios',

      // Formulario de horarios
      hoursFormTitle: 'Configurar horarios de operación',
      hoursTriggerButton: 'Configurar horarios',
      editHoursTrigger: 'Editar horarios',
      hoursFormHelp:
        'Elige los días que abres y define el rango horario. Al guardar los horarios el centro pasa a Activo.',
      hoursFormSubmit: 'Guardar horarios y activar',
      hoursFormSaving: 'Guardando…',
      hoursFormSaved: 'Guardado',
      hoursSavedToast: 'Horarios guardados correctamente',
      hoursDiscardTitle: '¿Descartar cambios?',
      hoursDiscardDescription:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',
      hoursDiscardConfirm: 'Descartar cambios',
      hoursDiscardCancel: 'Seguir editando',
      hoursFormError: 'No se pudieron guardar los horarios',

      day_sunday: 'Domingo',
      day_monday: 'Lunes',
      day_tuesday: 'Martes',
      day_wednesday: 'Miércoles',
      day_thursday: 'Jueves',
      day_friday: 'Viernes',
      day_saturday: 'Sábado',
      dayClosed: 'Cerrado',

      errOneDayMin: 'Selecciona al menos un día abierto.',
      errOpenBeforeClose:
        '{day}: la hora de apertura debe ser anterior a la de cierre.',

      // Banner del dashboard
      dashboardNoCenterTitle: 'Aún no tienes centro',
      dashboardNoCenterDescription:
        'Crea tu primer centro para empezar a gestionar niños, personal y facturación.',
      dashboardCreateCenter: 'Crear centro',
      dashboardCompleteTitle: 'Completa la configuración',
      dashboardCompleteDescription:
        'Configura los horarios de {name} para desbloquear todas las funciones.',
      dashboardContinue: 'Continuar configuración',
    },

    // Issue #6 — /profile module. Mirror exacto de las keys EN para
    // SUPER_ADMIN / DIRECTOR / STAFF.
    profile: {
      pageTitle: 'Mi perfil',
      pageSubtitle:
        'Actualizá tu información personal y la configuración de seguridad.',
      notSet: 'Sin completar',
      edit: 'Editar',
      save: 'Guardar',

      personalInfoTitle: 'Información personal',
      personalInfoEditTitle: 'Editar información personal',
      personalInfoEditSubtitle:
        'Actualizá cómo aparece tu nombre y teléfono en KinderCtrl.',
      fullName: 'Nombre completo',
      firstName: 'Nombre',
      firstNamePlaceholder: 'Juan',
      lastName: 'Apellido',
      lastNamePlaceholder: 'Pérez',
      phone: 'Teléfono',
      savedToast: 'Perfil actualizado.',
      saveError: 'No se pudo actualizar el perfil. Probá de nuevo.',

      securityTitle: 'Seguridad',
      email: 'Email',
      password: 'Contraseña',

      changeEmail: 'Cambiar email',
      changeEmailTitle: 'Cambiar email',
      changeEmailSubtitle:
        'Ingresá tu nuevo email y confirmá con tu contraseña actual.',
      currentEmail: 'Email actual',
      newEmail: 'Nuevo email',
      currentPassword: 'Contraseña actual',
      changeEmailConfirmTitle: '¿Cerrar sesión en todos los dispositivos?',
      changeEmailConfirmBody:
        'Cambiar el email va a cerrar tu sesión en todos los dispositivos, incluido este. Vas a tener que volver a entrar con el email nuevo.',
      changeEmailConfirmAction: 'Cambiar email y salir',
      emailChangedToast: 'Email actualizado. Volvé a iniciar sesión.',
      emailAlreadyInUse: 'Ese email ya está registrado.',
      changeEmailError: 'No se pudo cambiar el email. Probá de nuevo.',

      changePassword: 'Cambiar contraseña',
      changePasswordTitle: 'Cambiar contraseña',
      changePasswordSubtitle:
        'Ingresá tu contraseña actual y elegí una nueva.',
      newPassword: 'Nueva contraseña',
      confirmNewPassword: 'Confirmar nueva contraseña',
      passwordHint:
        'Al menos 8 caracteres con mayúscula, minúscula y un número o carácter especial.',
      changePasswordConfirmTitle: '¿Cerrar sesión en todos los dispositivos?',
      changePasswordConfirmBody:
        'Cambiar la contraseña va a cerrar tu sesión en todos los dispositivos, incluido este. Vas a tener que volver a entrar con la contraseña nueva.',
      changePasswordConfirmAction: 'Cambiar contraseña y salir',
      passwordChangedToast: 'Contraseña actualizada. Volvé a iniciar sesión.',
      currentPasswordWrong: 'La contraseña actual es incorrecta.',
      changePasswordError:
        'No se pudo cambiar la contraseña. Probá de nuevo.',

      sessionsRevokedWarning:
        'Esta acción va a cerrar tu sesión en todos los dispositivos, incluido este.',

      additionalInfoTitle: 'Información adicional',

      // v2 — hero card
      memberSince: 'Miembro desde {date}',
      badgeVerified: 'Verificado',
      badgeActive: 'Activo',
      editProfile: 'Editar perfil',

      // v2 — personal info card extension
      role: 'Rol',

      // v2 — contact info card
      contactInfoTitle: 'Información de contacto',
      timezone: 'Zona horaria',
      timezoneInheritedHint:
        'Heredada de {center}. Cambiala en la configuración del centro.',
      language: 'Idioma',
      languageHint: 'Cambia el idioma de la app al instante.',

      // v2 — center info card
      centerInfoTitle: 'Centro',
      centerViewDetails: 'Ver detalles',

      // v2 — emergency contact card
      emergencyContactTitle: 'Contacto de emergencia',
      emergencyContactEmpty: 'Todavía no cargaste un contacto de emergencia.',
      emergencyContactEditTitle: 'Editar contacto de emergencia',
      emergencyContactEditSubtitle:
        'Esta persona es a quien contactamos ante una emergencia.',
      emergencyContactSavedToast: 'Contacto de emergencia actualizado.',
      emergencyContactSaveError:
        'No se pudo guardar el contacto de emergencia. Probá de nuevo.',

      // v2 — preferences card
      preferencesTitle: 'Preferencias',
      theme: 'Tema',
      themeHint: 'Claro, oscuro o seguir el sistema.',
      timeFormat: 'Formato de hora',
      timeFormatHint: '12 horas (2:30 PM) o 24 horas (14:30).',

      // v3 — campos de dirección + label del botón Change inline
      change: 'Cambiar',
      address: 'Dirección',
      street: 'Calle',
      streetPlaceholder: 'Av. Corrientes 1234',
      city: 'Ciudad',
      cityPlaceholder: 'San Francisco',
      state: 'Estado',
      zipCode: 'Código postal',
      personalInfoEditAddressTitle: 'Dirección',

      // v4 — Security: row de Forgot password
      forgotPasswordLabel: '¿Olvidaste la contraseña?',
      forgotPasswordHint: 'Te enviamos un link para resetearla por email.',

      // v4 — Emergency Contact empty state ilustrado
      emergencyContactAdd: 'Agregar contacto de emergencia',

      // v4 — banner de confianza al pie de /profile
      footerSecurity: 'Tu información está protegida y encriptada.',

      // v6 — avatar camera overlay (decorativo hasta que llegue upload)
      changeAvatarSoon: 'Próximamente vas a poder subir tu foto',

      // v6 — Emergency Contact tabs duales (card + modal)
      emergencyContact1Tab: 'Contacto de emergencia 1',
      emergencyContact2Tab: 'Contacto de emergencia 2',
      // Variantes cortas para los tabs en mobile (el texto completo desborda).
      emergencyContact1Short: 'Contacto 1',
      emergencyContact2Short: 'Contacto 2',

      // v14 — STAFF-only label de DOB (Personal Info card + modal)
      dateOfBirth: 'Fecha de nacimiento',
    },

    // Módulo Settings (Fase 1) — secciones gateadas por rol. Tema + Formato de
    // hora movidos acá desde Perfil > Preferencias (mismos hooks/persistencia).
    settings: {
      pageTitle: 'Configuración',
      personalTitle: 'Personal',
      centerTitle: 'Centro',
      systemTitle: 'Sistema',
      theme: 'Tema',
      timeFormat: 'Formato de hora',
      comingSoon: 'Próximamente',
    },

    // Módulo Children — i18n (Follow-up B). Capa de vista: lista, detalle,
    // badge, empty states, tabla/card. Las claves de formularios van abajo.
    children: {
      // páginas / títulos / acciones
      title: 'Niños',
      myChildren: 'Mis niños',
      newChild: 'Nuevo niño',
      edit: 'Editar',
      editChild: 'Editar niño',
      back: 'Volver',
      // búsqueda / estados de lista
      searchPlaceholder: 'Buscar por nombre…',
      searchAria: 'Buscar niños',
      noMatchPrefix: 'Ningún niño coincide con',
      loadError: 'No se pudieron cargar los niños',
      // estados vacíos
      emptyTitle: 'Aún no hay niños',
      emptyTitleParent: 'Sin niños',
      emptyBody:
        'Agregá el primer niño para empezar a gestionar inscripción, padres e información médica.',
      emptyBodyParent: 'Todavía no tenés niños vinculados a tu cuenta.',
      // prompts de elegir centro (SA sin centro)
      selectCenter: 'Seleccioná un centro',
      selectCenterManaged:
        'Los niños se gestionan por centro. Abrí un centro y usá su pestaña Niños.',
      selectCenterCreate:
        'Los niños se crean dentro de un centro. Elegí uno primero.',
      goToCenters: 'Ir a Centros',
      notFound: 'Niño no encontrado, o no tenés acceso.',
      // encabezados de tabla + aria de fila
      colName: 'Nombre',
      colAge: 'Edad',
      colParents: 'Padres',
      colStatus: 'Estado',
      viewAria: 'Ver',
      // abreviaciones de edad (formatAge): "3a 2m" / "8 m"
      ageYearShort: 'a',
      ageMonthShort: 'm',
      ageMonthsOnlyShort: 'm',
      // badge de estado de inscripción
      statusPending: 'Pendiente',
      statusActive: 'Activo',
      statusInactive: 'Inactivo',
      statusWithdrawn: 'Retirado',
      // detalle — secciones de cards + filas
      childInformation: 'Información del niño',
      medical: 'Médico',
      parentsGuardians: 'Padres y tutores',
      dateOfBirth: 'Fecha de nacimiento',
      gender: 'Género',
      address: 'Dirección',
      phone: 'Teléfono',
      admissionDate: 'Fecha de admisión',
      firstDayOfCare: 'Primer día de cuidado',
      noMedical: 'Sin información médica registrada.',
      noContacts: 'Sin contactos registrados.',
      noDevelopment: 'Sin información de desarrollo registrada.',
      noRoutines: 'Sin información de rutinas registrada.',
      noToilet: 'Sin información de baño registrada.',
      doctor: 'Médico',
      doctorPhone: 'Teléfono del médico',
      specialNeeds: 'Necesidades especiales',
      medicationAllergies: 'Alergias a medicamentos',
      medicalPlan: 'Plan médico',
      yes: 'Sí',
      no: 'No',
      noParentsLinked: 'Sin padres vinculados.',
      primary: 'Principal',
      livesWithChild: 'Vive con el niño',
      // labels de género (MALE | FEMALE | OTHER)
      genderMale: 'Masculino',
      genderFemale: 'Femenino',
      genderOther: 'Otro',
      // labels de relación (MOTHER | FATHER | GUARDIAN | OTHER)
      relMother: 'Madre',
      relFather: 'Padre',
      relGuardian: 'Tutor',
      relOther: 'Otro',

      // ── formularios: wizard de creación + form de edición ──
      // títulos de paso + progreso
      stepChild: 'Niño',
      stepParents: 'Padres',
      stepMedical: 'Médico',
      stepReview: 'Revisión',
      stepXofY: 'Paso {n} de 4',
      // títulos de cards / grupos
      childDetails: 'Datos del niño',
      medicalOptional: 'Médico (opcional)',
      childsAddress: 'Dirección del niño',
      doctorAddress: 'Dirección del médico',
      enrollmentStartsAs: 'El estado de inscripción comienza como',
      // labels de campos
      firstName: 'Nombre',
      middleName: 'Segundo nombre',
      lastName: 'Apellido',
      birthDate: 'Fecha de nacimiento',
      enrollmentStatus: 'Estado de inscripción',
      fullName: 'Nombre completo',
      email: 'Email',
      relationship: 'Relación',
      existingParent: 'Padre existente',
      employer: 'Empleador',
      workPhone: 'Teléfono laboral',
      doctorName: 'Nombre del médico',
      allergies: 'Alergias',
      medications: 'Medicamentos',
      selectPlaceholder: 'Seleccioná…',
      fullNamePlaceholder: 'Nombre y apellido',
      // agregar / quitar de la lista editable + placeholders
      add: 'Agregar',
      removeAria: 'Quitar',
      addAllergy: 'Agregar una alergia…',
      addMedicationAllergy: 'Agregar una alergia a medicamento…',
      addMedication: 'Agregar un medicamento…',
      // tarjeta de padre
      parentWord: 'Padre',
      newParentBtn: 'Nuevo padre',
      linkExisting: 'Vincular existente',
      change: 'Cambiar',
      removeParentAria: 'Quitar padre',
      searchByNameOrEmail: 'Buscar por nombre o email…',
      searchExistingParentsAria: 'Buscar padres existentes',
      noMatchingParents: 'No hay padres coincidentes.',
      primaryContact: 'Contacto principal',
      sameAddressAsChild: 'Misma dirección que el niño',
      workDetailsOptional: 'Datos laborales (opcional)',
      welcomeEmailHint:
        'Se envía un email de bienvenida para que el padre defina su contraseña.',
      hasSpecialNeeds: 'Tiene necesidades especiales',
      // ── médico: campos extendidos Fase 2 (2A) ──
      sectionDoctor: 'Médico',
      sectionDentist: 'Dentista',
      sectionHealth: 'Salud',
      sectionPastIllnesses: 'Enfermedades previas',
      doctorLastExamDate: 'Fecha del último examen',
      isUnderDoctorCare: 'Actualmente bajo cuidado médico',
      prescribedMedicationDetails: 'Medicación recetada (qué tipo)',
      medicationSideEffects: 'Efectos secundarios de la medicación',
      dentistName: 'Nombre del dentista',
      dentistPhone: 'Teléfono del dentista',
      dentistAddress: 'Dirección del dentista',
      dentalPlan: 'Plan dental',
      specialDevices: 'Dispositivos especiales (lentes, audífonos, ortodoncia…)',
      frequentColds: 'Tiene resfríos frecuentes',
      frequentColdsCount: 'Resfríos por año',
      otherIllnesses: 'Otras enfermedades',
      illnessDateAria: 'Fecha de',
      illnessChickenPox: 'Varicela',
      illnessAsthma: 'Asma',
      illnessRheumaticFever: 'Fiebre reumática',
      illnessHayFever: 'Fiebre del heno',
      illnessDiabetes: 'Diabetes',
      illnessEpilepsy: 'Epilepsia',
      illnessWhoopingCough: 'Tos convulsa',
      illnessMumps: 'Paperas',
      illnessPoliomyelitis: 'Poliomielitis',
      illnessTenDayMeasles: 'Sarampión (diez días)',
      illnessThreeDayMeasles: 'Rubéola (tres días)',
      // ── contactos: Fase 2 (2A) ──
      contacts: 'Contactos',
      sectionEmergency: 'Contactos de emergencia',
      sectionAuthorizedPickup: 'Autorizados a retirar',
      sectionResponsible: 'Persona responsable',
      authorizedPickupNote:
        'No se entregará al niño a nadie que no figure en esta lista.',
      contactName: 'Nombre',
      contactAddress: 'Dirección',
      homePhone: 'Teléfono particular',
      addContact: 'Agregar contacto',
      removeContactAria: 'Eliminar contacto',
      removeContactTitle: '¿Eliminar contacto?',
      removeContactDesc:
        'Este contacto se eliminará cuando guardes esta pestaña.',
      saveContacts: 'Guardar contactos',
      toastContactsSaved: 'Contactos guardados.',
      errContactNameRequired: 'Cada contacto necesita un nombre.',
      // ── development / routines / toilet: Fase 2 (2B) ──
      development: 'Desarrollo',
      routines: 'Rutinas',
      toilet: 'Baño',
      // Development tab
      walkedAtMonths: 'Caminó a los (meses)',
      talkedAtMonths: 'Habló a los (meses)',
      toiletTrainedAtMonths: 'Dejó el pañal a los (meses)',
      developmentNotes: 'Notas de desarrollo',
      // Routines tab
      wakeUpTime: 'Hora de despertarse',
      bedTime: 'Hora de dormir',
      takesNap: 'Hace siesta',
      napStartTime: 'Inicio de siesta',
      napEndTime: 'Fin de siesta',
      diet: 'Dieta / restricciones',
      mealTimes: 'Horarios de comida',
      // Toilet tab
      toiletTrained: 'Dejó el pañal',
      toiletWords: 'Palabras que usa',
      toiletHelpLevel: 'Ayuda que necesita',
      toiletAccidents: 'Accidentes (frecuencia / notas)',
      toiletHelpIndependent: 'Independiente',
      toiletHelpNeedsReminders: 'Necesita recordatorios',
      toiletHelpNeedsAssistance: 'Necesita ayuda',
      toiletHelpFullAssistance: 'Ayuda total',
      toiletHelpInDiapers: 'Usa pañales',
      // saves + toasts (2B)
      saveDevelopment: 'Guardar desarrollo',
      saveRoutines: 'Guardar rutinas',
      saveToilet: 'Guardar baño',
      toastDevelopmentSaved: 'Desarrollo guardado',
      toastRoutinesSaved: 'Rutinas guardadas',
      toastToiletSaved: 'Baño guardado',
      errNapEndBeforeStart: 'El fin de la siesta debe ser posterior al inicio.',
      // ── detail refactor: vista+edición unificada ──
      phonePrimaryContactHint: 'Teléfono de {name}, contacto primario',
      syncPhoneTitle: '¿Editar el teléfono del contacto primario?',
      syncPhoneDesc: 'Esto editará el teléfono de {name}, el contacto primario. ¿Continuar?',
      confirm: 'Confirmar',
      alertBadgeHint: 'Registrado',
      medicalConditionsLabel: 'Condiciones médicas',
      allergiesMedications: 'Alergias y medicamentos',
      badgeAllergies: 'Alergias',
      badgeSpecialCare: 'Cuidados especiales',
      addMedicalCondition: 'Agregar condición',
      insuranceCard: 'Seguro',
      insuranceProvider: 'Proveedor del seguro',
      insurancePolicy: 'Número de póliza',
      // ── Fase 2 (2C): personalidad + permisos ──
      personality: 'Personalidad',
      permissions: 'Permisos',
      persLikes: 'Gustos y preferencias',
      persBehavior: 'Comportamiento y convivencia',
      persNotes: 'Notas',
      personalityWords: 'Cinco palabras que lo describen',
      likesToDo: 'Qué le gusta hacer',
      favoriteFoods: 'Comidas favoritas',
      dislikedFoods: 'Comidas que no le gustan',
      fears: 'Miedos',
      favoriteIndoorActivity: 'Actividad favorita en interiores',
      favoriteOutdoorActivity: 'Actividad favorita al aire libre',
      favoriteToy: 'Juguete favorito',
      napsAtHome: 'Hace siesta en casa',
      napTimeAtHome: 'Horario de siesta en casa',
      expressesEmotions: 'Cómo expresa sus emociones',
      homeDiscipline: 'Disciplina en casa',
      getsAlongWith: 'Cómo se lleva (padres / hermanos / otros)',
      groupPlayExperience: 'Experiencia de juego en grupo',
      sickCarePlan: 'Plan de cuidado cuando está enfermo',
      transitionTips: 'Consejos para una transición positiva',
      anythingElse: 'Algo más que quieran compartir',
      commaHint: 'Separá con comas',
      consentApproved: 'Aprobado',
      consentNotApproved: 'No aprobado',
      consentWaterPlay: 'Juegos con agua',
      consentPhotoInternal: 'Fotos — uso interno',
      consentPhotoMarketing: 'Fotos — marketing',
      consentSunscreen: 'Bloqueador solar / repelente',
      consentEmergencyMedical: 'Atención médica de emergencia',
      consentEmergencyTransport: 'Transporte de emergencia',
      sunscreenProducts: 'Nombres de productos',
      sunscreenInstructions: 'Instrucciones',
      sunscreenDates: 'Fechas de vigencia',
      sunscreenStartDate: 'Fecha de inicio',
      sunscreenEndDate: 'Fecha de fin',
      signedBy: 'Registrado por {name} el {date}',
      unknownUser: 'un miembro del personal',
      // ── Fase 2 (2D): plan de sueño infante + gaps ──
      infantSleep: 'Sueño (infante)',
      infantOnlyNote: 'Solo aplica a infantes (menores de 12 meses).',
      noInfantSleep: 'Sin plan de sueño registrado.',
      sleepLocation: 'Dónde duerme',
      sleepLocationOther: 'Otro (especificar)',
      sleepCrib: 'Cuna',
      sleepPlayYard: 'Corralito',
      sleepOther: 'Otro',
      usualSleepHours: 'Horas usuales de sueño',
      averageNapDuration: 'Duración promedio de siesta',
      usesPacifier: 'Usa chupón',
      pacifierYes: 'Sí',
      pacifierNo: 'No',
      pacifierSometimes: 'A veces',
      pacifierBrand: 'Marca del chupón',
      canRollOver: 'Puede rodar',
      rollOverDate: 'Empezó a rodar el',
      providerObservedRoll: 'El proveedor observó que rueda',
      medicalExemption: 'Exención médica de posición de dormir',
      medicalExemptionInstructions: 'Instrucciones del médico',
      unanswered: 'Sin responder',
      sleepsWell: 'Duerme bien',
      eatingProblems: 'Problemas para comer',
      toiletWordBowel: 'Palabra para popó',
      toiletWordUrination: 'Palabra para pis',
      bowelMovementsRegular: 'Movimientos intestinales regulares',
      bowelMovementTime: 'Hora usual',
      reasonForCare: 'Razón para solicitar el cuidado',
      lastEnrollmentDate: 'Última fecha de inscripción',
      addAnotherParent: 'Agregar otro padre',
      addParent: 'Agregar padre',
      // botones de navegación
      cancel: 'Cancelar',
      previous: 'Anterior',
      next: 'Siguiente',
      createChild: 'Crear niño',
      // labels / valores solo del review
      type: 'Tipo',
      homeAddress: 'Dirección particular',
      workAddress: 'Dirección laboral',
      sameAsChild: 'Igual que el niño',
      editChildAria: 'Editar niño',
      editParentsAria: 'Editar padres',
      editMedicalAria: 'Editar médico',
      // toasts
      toastCreated: 'Niño creado',
      toastCreateFailed: 'No se pudo crear el niño',
      toastDetailsSaved: 'Datos del niño guardados',
      toastMedicalSaved: 'Información médica guardada',
      toastParentsSaved: 'Padres guardados',
      toastSaveFailed: 'No se pudieron guardar los cambios',
      // diálogos
      removeParentTitle: '¿Quitar este padre?',
      removeParentDescWizard:
        'Este padre tiene datos cargados. Al quitar la tarjeta se descartan.',
      removeParentDescEdit:
        'El registro del padre se conserva — solo se quita el vínculo con este niño (al guardar).',
      createTitle: '¿Crear este niño?',
      createDescription: '¿Crear este niño con la información que ingresaste?',
      create: 'Crear',
      saveChangesTitle: '¿Guardar cambios?',
      saveChangesDesc: '¿Aplicar los cambios a esta sección?',
      unsavedTitle: 'Cambios sin guardar',
      unsavedTabDesc:
        'Tenés cambios sin guardar en esta sección. ¿Guardar antes de continuar?',
      discard: 'Descartar',
      saveAndContinue: 'Guardar y continuar',
      save: 'Guardar',
      remove: 'Quitar',
      saveDetails: 'Guardar datos',
      saveParents: 'Guardar padres',
      saveMedical: 'Guardar médico',
      editSectionsAria: 'Editar secciones',
      // guards de salida
      unsavedLeaveWizard:
        'Tenés cambios sin guardar. Si salís se descartará la información ingresada.',
      unsavedLeaveEdit: 'Tenés cambios sin guardar. Si salís se descartarán.',
      // validación
      errFirstNameRequired: 'El nombre es obligatorio.',
      errLastNameRequired: 'El apellido es obligatorio.',
      errBirthDateRequired: 'La fecha de nacimiento es obligatoria.',
      errBirthDateFuture: 'La fecha de nacimiento no puede ser futura.',
      errGenderRequired: 'El género es obligatorio.',
      errAtLeastOneParent: 'Se requiere al menos un padre.',
      errMarkPrimary: 'Marcá un padre como principal.',
      errRelationshipRequired: 'la relación es obligatoria.',
      errPickExisting: 'elegí un padre existente.',
      errFullNameRequired: 'el nombre completo (nombre y apellido) es obligatorio.',
      errEmailRequired: 'se requiere un email válido.',
    },

    // v9 — affordance del sidebar colapsable
    sidebar: {
      expand: 'Expandir sidebar',
      collapse: 'Contraer sidebar',
      pinExpansion: 'Fijar sidebar expandido',
    },

    topbar: {
      logout: 'Cerrar sesión',
    },
  },
} as const;
