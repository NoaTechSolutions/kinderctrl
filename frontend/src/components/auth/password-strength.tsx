'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  calculatePasswordStrength,
  type StrengthLevel,
} from '@/lib/utils/password-strength';

const BAR_COLOR: Record<StrengthLevel, string> = {
  empty: 'var(--kc-border)',
  weak: 'var(--kc-error)',
  medium: 'var(--kc-warning)',
  strong: 'var(--kc-success)',
};

const LABEL_COLOR: Record<StrengthLevel, string> = {
  empty: 'var(--kc-text-4)',
  weak: 'var(--kc-error)',
  medium: 'var(--kc-warning)',
  strong: 'var(--kc-success)',
};

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation();
  const strength = calculatePasswordStrength(password);

  const labels: Record<StrengthLevel, string> = {
    empty: '—',
    weak: t('strengthWeak'),
    medium: t('strengthMed'),
    strong: t('strengthStrong'),
  };

  return (
    <div className="space-y-2.5 mt-2">
      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--kc-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${strength.fill}%`,
              background: BAR_COLOR[strength.level],
            }}
          />
        </div>
        <span
          className="font-mono text-[10.5px] font-semibold tracking-wider min-w-[44px] text-right uppercase"
          style={{ color: LABEL_COLOR[strength.level] }}
        >
          {labels[strength.level]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Requirement met={strength.checks.length} label={t('reqLength')} />
        <Requirement met={strength.checks.upper} label={t('reqUpper')} />
        <Requirement met={strength.checks.number} label={t('reqNumber')} />
      </div>
    </div>
  );
}

interface RequirementProps {
  met: boolean;
  label: string;
}

function Requirement({ met, label }: RequirementProps) {
  return (
    <div
      className="flex items-center gap-2 text-xs transition-colors"
      style={{ color: met ? 'var(--kc-success)' : 'var(--kc-text-3)' }}
    >
      <span
        className={cn(
          'w-3.5 h-3.5 rounded-full flex items-center justify-center flex-none',
          met ? 'border-0' : 'border-[1.5px]',
        )}
        style={{
          background: met ? 'var(--kc-success)' : 'transparent',
          borderColor: met ? 'transparent' : 'var(--kc-border-strong)',
          color: 'white',
        }}
      >
        {met && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </span>
      <span className={cn(met && 'line-through opacity-70')}>{label}</span>
    </div>
  );
}
