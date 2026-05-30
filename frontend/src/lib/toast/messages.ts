// PO QA #51 — single source of truth for standardized toast/confirm copy.
//
// Each entry is an i18n KEY (not literal text) so the actual wording
// lives in translations.ts and can be localized. Call sites pass these
// keys through useTranslation's t() to render the message.
//
// Pattern at call site:
//   const { t } = useTranslation();
//   toast.success(t(TOAST_KEYS.staff.updated));
//
// Adding a new toast: pick (or invent) the i18n key, add it both here
// (typed entry) and in translations.ts (EN + ES copy). The TS compiler
// catches typos in the key reference, which the raw `t('...')` literal
// at the call site did not.

export const TOAST_KEYS = {
  staff: {
    created: 'staff.createdToast',
    updated: 'staff.updatedToast',
    updatedAndSetupSent: 'staff.updatedAndSetupSentToast',
    deleted: 'staff.deletedToast',
    createError: 'staff.createError',
    updateError: 'staff.updateError',
    deleteError: 'staff.deleteError',
    loadError: 'staff.loadError',
    sendResetSuccess: 'staff.sendResetSuccess',
    sendResetError: 'staff.sendResetError',
    bgSaved: 'staff.bgSaved',
    bgSaveError: 'staff.bgSaveError',
    cprSaved: 'staff.cprSaved',
    cprSaveError: 'staff.cprSaveError',
  },
  centers: {
    created: 'centers.createdToast',
    updated: 'centers.updatedToast',
    deleted: 'centers.deletedToast',
    statusChanged: 'centers.statusChangedToast',
    // Operating hours editor (lives in centers/hours-form.tsx but the
    // i18n key sits under the `setup.` namespace where the rest of the
    // hours-related copy lives).
    hoursSaved: 'setup.hoursSavedToast',
  },
  admin: {
    unlocked: 'admin.unlockedToast',
    unlockError: 'admin.unlockError',
  },
  // Cross-cutting copies used by the unsaved-changes / cancel flows.
  // Lives outside the per-module groups because the same prompt fires
  // from any form.
  forms: {
    unsavedChangesPrompt: 'staff.unsavedChangesPrompt',
  },
} as const;
