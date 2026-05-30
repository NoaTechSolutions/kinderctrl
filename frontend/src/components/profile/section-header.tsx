'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CardTitle } from '@/components/ui/card';

// Profile section header: colored icon-badge + title pattern shared
// by every profile card (Personal/Security/Preferences/Emergency).
// Visual formula (from the spec):
//
//   [ rounded-lg  bg-{token}/10  p-2 ]  <Icon className="text-{token}" />
//
// Tones map to SAAS DESIGN TOKENS — not arbitrary chromatic names.
// `primary` is the brand color (--kc-p-600 via Tailwind v4's
// --color-primary), `destructive` is --kc-error (security / dangerous
// actions), `warning` is --kc-warning (emergency / alert framing).
// All three are mapped in globals.css under @theme inline, so the
// Tailwind utilities below resolve at build time.
//
// API note: Tailwind v4 still requires literal class strings at build
// time — it can NOT inline arbitrary `bg-{var}/10`. That's why the
// allowlist is a const map, not a template literal.
type Tone = 'primary' | 'destructive' | 'warning';

const TONE_CLASSES: Record<Tone, { wrap: string; icon: string }> = {
  primary: { wrap: 'bg-primary/10', icon: 'text-primary' },
  destructive: { wrap: 'bg-destructive/10', icon: 'text-destructive' },
  warning: { wrap: 'bg-warning/10', icon: 'text-warning' },
};

interface SectionHeaderProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  // Optional right-aligned element (action button, badge, etc.) so the
  // section title row can host page-level affordances without a
  // separate header row.
  action?: ReactNode;
}

export function SectionHeader({
  icon: Icon,
  tone,
  title,
  action,
}: SectionHeaderProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`rounded-lg p-2 ${classes.wrap}`}>
          <Icon className={`h-4 w-4 ${classes.icon}`} aria-hidden />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
