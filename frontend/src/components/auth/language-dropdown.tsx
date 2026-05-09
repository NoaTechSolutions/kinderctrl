'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function LanguageDropdown() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}. Click to change`}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
        style={{
          background: 'var(--kc-surface)',
          borderColor: 'var(--kc-border)',
          color: 'var(--kc-text-2)',
        }}
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {current.code.toUpperCase()}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            open && 'rotate-180',
          )}
          style={{ color: 'var(--kc-text-3)' }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language options"
          className="kc-fade-in absolute right-0 mt-2 w-48 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            background: 'var(--kc-surface)',
            borderColor: 'var(--kc-border)',
          }}
        >
          {LANGUAGES.map(({ code, label, flag }) => {
            const selected = locale === code;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors"
                  style={
                    selected
                      ? {
                          background:
                            'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
                          color: 'var(--kc-p-700)',
                        }
                      : { color: 'var(--kc-text-2)' }
                  }
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'var(--kc-surface-2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base leading-none" aria-hidden>
                      {flag}
                    </span>
                    <span className="font-medium">{label}</span>
                  </span>
                  {selected && <Check className="w-4 h-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
