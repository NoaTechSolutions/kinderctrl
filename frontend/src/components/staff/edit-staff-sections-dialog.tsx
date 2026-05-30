'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { StaffForm, type StaffFormSectionKey } from './staff-form';
import { BackgroundCheckForm } from './background-check-form';
import { CprCertificationForm } from './cpr-certification-form';
import { useUpdateStaff } from '@/lib/hooks/use-staff';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useTranslation } from '@/lib/i18n';
import type { Staff, StaffStatus } from '@/lib/types/staff';
import type { StaffFormData } from '@/lib/schemas/staff';

// PO QA #47 (BUG 2 fix): the form schema carries compliance edit fields
// (used by /staff/[id]/edit which coordinates the dedicated
// /background-check + /cpr endpoints). UpdateStaffDto on the backend
// does NOT accept those fields, and the global ValidationPipe runs with
// `forbidNonWhitelisted: true` — so passing them through this modal's
// single-shot PATCH /staff/:id returns 400. The modal isn't the
// coordinator; it only owns the basic-update endpoint. Strip the
// compliance subset before mutate.
//
// Kept local rather than imported from the /edit page because the page
// can't export the helper cleanly (Next.js page modules), and a shared
// util module would be overkill for a 6-field strip.
type ModalPayload = StaffFormData & { status?: StaffStatus };

function stripComplianceFields(payload: ModalPayload): ModalPayload {
  const {
    backgroundCheckCompleted: _bg,
    backgroundCheckApproved: _bgApproved,
    cprCertified: _cpr,
    cprStatus: _cprStatus,
    cprCertificationDate: _cprDate,
    cprExpiryDate: _cprExp,
    cprNotes: _cprNotes,
    ...rest
  } = payload;
  return rest as ModalPayload;
}

// Generic per-card edit dialog (PO QA #36 Opción C hybrid). Renders the
// same StaffForm used by /staff/new and /staff/[id]/edit, but filtered
// to a subset of sections via the `sections` prop. ONE form, ONE schema,
// ONE submit path (PATCH /staff/:id via useUpdateStaff).
//
// PO QA #44 final spec — when sections includes 'employment', the dialog
// renders 3 tabs (Employment / Background / CPR) and opens on the one
// indicated by `initialTab`. Employment tab uses StaffForm (PATCH /staff
// /:id), BG/CPR tabs use their dedicated forms which call their own
// endpoints. For non-employment sections (personal, address, emergency)
// the dialog falls back to a plain StaffForm with no tabs.
type EmploymentTab = 'employment' | 'bg' | 'cpr';

interface EditStaffSectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff;
  sections: ReadonlyArray<StaffFormSectionKey>;
  title: string;
  description?: string;
  // Only honored when sections includes 'employment' — selects which of
  // the 3 employment tabs is active on open. Defaults to 'employment'.
  initialTab?: EmploymentTab;
}

export function EditStaffSectionsDialog({
  open,
  onOpenChange,
  staff,
  sections,
  title,
  description,
  initialTab,
}: EditStaffSectionsDialogProps) {
  const { t } = useTranslation();
  const mutation = useUpdateStaff();
  // PO QA #63: on phones ≤640px the 3-tab strip overflowed the dialog
  // (same pattern as the detail card in QA #62). On mobile we stack the
  // three sub-forms (Employment / Background / CPR) with section
  // headings + separators — each form keeps its own Save button and
  // calls its own endpoint, so they're independent.
  const isMobile = useMediaQuery('(max-width: 640px)');

  const isEmploymentDialog = sections.includes('employment');
  const [activeTab, setActiveTab] = useState<EmploymentTab>(
    initialTab ?? 'employment',
  );

  // Sync activeTab with initialTab when the dialog re-opens with a new
  // trigger (e.g. user closes via header → reopens via BG icon). Without
  // this the dialog "remembers" the last tab from the previous open
  // session because useState only seeds on mount.
  useEffect(() => {
    if (open) setActiveTab(initialTab ?? 'employment');
  }, [open, initialTab]);

  const handleSubmit = (data: StaffFormData & { status?: StaffStatus }) => {
    mutation.mutate(
      { id: staff.id, data: stripComplianceFields(data) },
      {
        onSuccess: () => {
          toast.success(t('staff.updatedToast'));
          onOpenChange(false);
        },
      },
    );
  };

  const closeDialog = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * max-h-[90vh] + overflow-y-auto: the form can be tall so let it
       * scroll inside the modal. The [&>*]:min-w-0 trick (PO QA #18)
       * keeps the CenterCombobox / truncated names from blowing past the
       * dialog width.
       */}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          {/* PO QA #64: on mobile the dialog renders ONLY the section
              the user actually clicked (Employment / BG / CPR) instead
              of stacking all three. Title must follow — show the
              section-specific title rather than the generic "Edit
              Employment" inherited from page.tsx's editDialogConfig.
              Desktop keeps the prop-supplied title (it heads the tab
              strip that covers all three sections). */}
          <DialogTitle>
            {isEmploymentDialog && isMobile
              ? initialTab === 'bg'
                ? t('staff.bgEditTitle')
                : initialTab === 'cpr'
                  ? t('staff.cprEditTitle')
                  : t('staff.editEmployment')
              : title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isEmploymentDialog ? (
          isMobile ? (
            // PO QA #64: mobile renders one focused form per click —
            // whichever section the trigger pointed at via initialTab.
            // No tab strip, no stacked sections; each ✏️ on the detail
            // card opens its own modal. The desktop branch below
            // remains the 3-tab dialog because horizontal room is
            // plenty there.
            <div>
              {initialTab === 'bg' ? (
                <BackgroundCheckForm staff={staff} onClose={closeDialog} />
              ) : initialTab === 'cpr' ? (
                <CprCertificationForm staff={staff} onClose={closeDialog} />
              ) : (
                <StaffForm
                  mode="edit"
                  initialData={staff}
                  isSubmitting={mutation.isPending}
                  serverError={mutation.error}
                  onSubmit={handleSubmit}
                  onCancel={closeDialog}
                  sections={sections}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <FilterTabs<EmploymentTab>
                tabs={[
                  {
                    value: 'employment',
                    label: t('staff.detailEmploymentTabShort'),
                  },
                  { value: 'bg', label: t('staff.detailBgLabel') },
                  { value: 'cpr', label: t('staff.detailCprTabShort') },
                ]}
                value={activeTab}
                onChange={setActiveTab}
                ariaLabel={t('staff.editEmployment')}
              />

              {activeTab === 'employment' && (
                <StaffForm
                  mode="edit"
                  initialData={staff}
                  isSubmitting={mutation.isPending}
                  serverError={mutation.error}
                  onSubmit={handleSubmit}
                  onCancel={closeDialog}
                  sections={sections}
                />
              )}

              {activeTab === 'bg' && (
                <BackgroundCheckForm staff={staff} onClose={closeDialog} />
              )}

              {activeTab === 'cpr' && (
                <CprCertificationForm staff={staff} onClose={closeDialog} />
              )}
            </div>
          )
        ) : (
          <StaffForm
            mode="edit"
            initialData={staff}
            isSubmitting={mutation.isPending}
            serverError={mutation.error}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            sections={sections}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
