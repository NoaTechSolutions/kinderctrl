'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export type RoleValue = 'DIRECTOR' | 'STAFF' | 'PARENT';

interface RolePillsProps {
  value: RoleValue;
  onChange: (role: RoleValue) => void;
  name?: string;
}

export function RolePills({ value, onChange, name = 'role' }: RolePillsProps) {
  const { t } = useTranslation();

  const roles: { value: RoleValue; label: string }[] = [
    { value: 'DIRECTOR', label: t('roleDirector') },
    { value: 'STAFF', label: t('roleStaff') },
    { value: 'PARENT', label: t('roleParent') },
  ];

  return (
    <div className="flex gap-2" role="radiogroup" aria-label={name}>
      {roles.map((role) => {
        const selected = value === role.value;
        return (
          <button
            key={role.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role.value)}
            className={cn(
              'flex-1 h-11 rounded-xl border-[1.5px] text-sm transition-all',
              selected ? 'font-semibold' : 'font-medium',
            )}
            style={
              selected
                ? {
                    borderColor: 'var(--kc-p-600)',
                    background:
                      'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
                    color: 'var(--kc-p-700)',
                  }
                : {
                    borderColor: 'var(--kc-border)',
                    background: 'var(--kc-surface)',
                    color: 'var(--kc-text-2)',
                  }
            }
          >
            {role.label}
          </button>
        );
      })}
    </div>
  );
}
