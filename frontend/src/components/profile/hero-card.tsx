'use client';

import { Camera, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { MyProfile } from '@/lib/api/auth';
import { getDisplayRole } from '@/lib/user-display';
import { useAuthStore } from '@/store/auth';
import { UserAvatar } from './user-avatar';

// Profile v3 — hero card. Display-only now: XL avatar (96px) + name +
// email + "Member since {month year}" + three badges (Verified static,
// Active when status=ACTIVE, Role pill).
//
// v2 had an "Edit profile" button here; v3 dropped it because Personal
// Information's own card now owns the single editing affordance (the
// modal it opens includes every field this card displays).
interface HeroCardProps {
  profile: MyProfile;
}

export function HeroCard({ profile }: HeroCardProps) {
  const { t } = useTranslation();
  // getDisplayRole needs the AuthUser (carries STAFF subrole). Pulling
  // from the store keeps HeroCard a pure projection over MyProfile +
  // role display.
  const user = useAuthStore((s) => s.user);

  const fullName =
    profile.firstName || profile.lastName
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
      : null;

  // v8: "Member since" line removed per Israel — hero is now strictly
  // 3 lines on the right (name + email + badges) and the avatar is
  // sized to match that vertical footprint.

  const isActive = profile.status === 'ACTIVE';

  return (
    // v4: subtle brand-tinted gradient washes the hero card so it
    // reads as the "primary identity surface" without needing a heavy
    // color block. `from-primary/5` is barely-there in light mode and
    // shows just a hint in dark mode — the spec's intent.
    <Card className="bg-gradient-to-br from-primary/5 to-transparent">
      {/* Mobile is now a ROW too (avatar left, info centered beside it) — not
          stacked. In a row the info's flex-1 + min-w-0 + the name/email truncate
          finally constrain width, so a long email truncates instead of pushing
          the card past the viewport (the ~375px lateral-overflow bug). Reduced
          horizontal padding (px-4) gives ~320px more room. Desktop unchanged. */}
      <CardContent className="flex flex-row items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6">
        {/* v7: avatar now actually renders large (176px / size-44).
            See the long comment in user-avatar.tsx — v3-v6 had a CSS
            specificity bug where the primitive's data-[size=lg]:size-10
            silently won over my className override. Camera overlay
            grew too (p-2 + h-5 w-5 icon) so it stays proportional. */}
        <div className="relative inline-block flex-none">
          <UserAvatar
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            size="xl"
            // ring-4 + ring-offset-2 lift the avatar visually off the
            // gradient — the 4px ring picks up the page background
            // color, the offset adds a hairline of card surface
            // between the avatar edge and the ring so it reads as a
            // floating disc.
            className="ring-4 ring-background ring-offset-2 ring-offset-card"
          />
          <button
            type="button"
            aria-label={t('profile.changeAvatarSoon')}
            title={t('profile.changeAvatarSoon')}
            disabled
            className="absolute bottom-0.5 right-0.5 rounded-full border-2 p-1.5 shadow-sm cursor-not-allowed transition-colors"
            style={{
              background: 'var(--kc-bg)',
              borderColor: 'var(--kc-border)',
            }}
          >
            <Camera
              className="h-3.5 w-3.5"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
          </button>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="min-w-0">
            <h2
              className="font-display text-2xl font-semibold tracking-tight truncate"
              title={fullName ?? profile.email}
            >
              {fullName ?? t('profile.notSet')}
            </h2>
            <p
              className="text-sm truncate"
              style={{ color: 'var(--kc-text-3)' }}
              title={profile.email}
            >
              {profile.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge
              icon={<ShieldCheck className="h-3 w-3" aria-hidden />}
              label={t('profile.badgeVerified')}
              tone="success"
            />
            {isActive && (
              <Badge
                icon={<CheckCircle2 className="h-3 w-3" aria-hidden />}
                label={t('profile.badgeActive')}
                tone="success"
              />
            )}
            {user && (
              <Badge label={getDisplayRole(user)} tone="brand" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({
  icon,
  label,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  tone: 'success' | 'brand';
}) {
  const styles =
    tone === 'success'
      ? {
          background: 'color-mix(in oklch, var(--kc-success), transparent 85%)',
          color: 'var(--kc-success)',
        }
      : { background: 'var(--kc-p-50)', color: 'var(--kc-p-700)' };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={styles}
    >
      {icon}
      {label}
    </span>
  );
}
