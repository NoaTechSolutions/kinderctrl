'use client';

import { useState, type ReactNode } from 'react';
import { Link2, Pencil, Phone, PhoneCall, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { useTranslation } from '@/lib/i18n';
import type { MyProfile, MyEmergencyContact } from '@/lib/api/auth';
import { formatPhoneUS } from '@/lib/utils/phone';
import { EmergencyContactModal } from './emergency-contact-modal';

// Profile v6 — primary + secondary emergency contacts under one card,
// switched via FilterTabs (Contact 1 / Contact 2). Same pattern Staff
// uses inside its create/edit form. Each tab is a fully independent
// display + edit surface — opening the modal carries the active tab
// as `initialTab` so the user lands on the contact they were viewing.
type ContactSlot = 1 | 2;

interface EmergencyContactSectionProps {
  profile: MyProfile;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'staff.relFather',
  mother: 'staff.relMother',
  spouse: 'staff.relSpouse',
  partner: 'staff.relPartner',
  sibling: 'staff.relSibling',
  friend: 'staff.relFriend',
  other: 'staff.relOther',
};

export function EmergencyContactSection({
  profile,
}: EmergencyContactSectionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ContactSlot>(1);
  const [open, setOpen] = useState(false);

  const ec = activeTab === 1 ? profile.emergencyContact1 : profile.emergencyContact2;

  // Responsive labels — short on phones (full text overflowed ~375px),
  // full on sm: up.
  const tabs: ReadonlyArray<{ value: ContactSlot; label: ReactNode }> = [
    {
      value: 1,
      label: (
        <>
          <span className="sm:hidden">{t('profile.emergencyContact1Short')}</span>
          <span className="hidden sm:inline">{t('profile.emergencyContact1Tab')}</span>
        </>
      ),
    },
    {
      value: 2,
      label: (
        <>
          <span className="sm:hidden">{t('profile.emergencyContact2Short')}</span>
          <span className="hidden sm:inline">{t('profile.emergencyContact2Tab')}</span>
        </>
      ),
    },
  ];

  return (
    <>
      <ReadCard
        icon={PhoneCall}
        title={t('profile.emergencyContactTitle')}
        // Edit only renders when there's data to edit in the active tab.
        // Empty tab uses the EmptyState's own Add button instead.
        action={
          ec ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(true)}
              aria-label={t('profile.edit')}
              title={t('profile.edit')}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {/* FilterTabs — tablist switches between the two contacts. */}
          <FilterTabs<ContactSlot>
            tabs={tabs}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel={t('profile.emergencyContactTitle')}
          />

          {ec ? (
            <ContactDisplay contact={ec} t={t} />
          ) : (
            <EmptyState onAdd={() => setOpen(true)} />
          )}
        </div>
      </ReadCard>

      <EmergencyContactModal
        open={open}
        onOpenChange={setOpen}
        profile={profile}
        initialTab={activeTab}
      />
    </>
  );
}

function ContactDisplay({
  contact,
  t,
}: {
  contact: MyEmergencyContact;
  t: (key: string) => string;
}) {
  const relKey = contact.relationship
    ? RELATIONSHIP_LABELS[contact.relationship]
    : undefined;
  return (
    <ReadGrid cols={2}>
      <ReadRow
        icon={UserIcon}
        label={t('staff.emergencyName')}
        value={contact.name}
      />
      <ReadRow
        icon={Phone}
        label={t('staff.emergencyPhone')}
        value={contact.phone ? formatPhoneUS(contact.phone) : null}
      />
      <ReadRow
        icon={Link2}
        label={t('staff.emergencyRelationship')}
        value={relKey ? t(relKey) : null}
      />
    </ReadGrid>
  );
}

// v4: illustrated empty state. PhoneCall icon centered with two
// concentric scaled borders (decorative rings) so the icon reads as
// "ringing / waiting for a contact". A red notification dot in the
// top-right corner adds urgency framing without being heavy. The CTA
// button is the primary action — clicking it opens the same modal as
// the populated-state Edit button, pre-selecting the empty tab.
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
      <div className="relative">
        <span
          className="absolute inset-0 rounded-full border scale-110 pointer-events-none"
          style={{
            borderColor:
              'color-mix(in oklch, var(--kc-warning), transparent 70%)',
          }}
          aria-hidden
        />
        <span
          className="absolute inset-0 rounded-full border scale-125 pointer-events-none"
          style={{
            borderColor:
              'color-mix(in oklch, var(--kc-warning), transparent 85%)',
          }}
          aria-hidden
        />
        <div
          className="relative rounded-full p-4"
          style={{
            background:
              'color-mix(in oklch, var(--kc-warning), transparent 90%)',
          }}
        >
          <PhoneCall
            className="h-7 w-7"
            style={{ color: 'var(--kc-warning)' }}
            aria-hidden
          />
        </div>
        <span
          className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full"
          style={{
            background: 'var(--kc-error)',
            boxShadow: '0 0 0 2px var(--kc-bg)',
          }}
          aria-hidden
        />
      </div>

      <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
        {t('profile.emergencyContactEmpty')}
      </p>

      <Button type="button" size="sm" onClick={onAdd}>
        {t('profile.emergencyContactAdd')}
      </Button>
    </div>
  );
}
