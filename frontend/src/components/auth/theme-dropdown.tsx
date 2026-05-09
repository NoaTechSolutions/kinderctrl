'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type Theme } from '@/lib/theme';

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
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

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];
  const TriggerIcon = current.Icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Click to change`}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
        style={{
          background: 'var(--kc-surface)',
          borderColor: 'var(--kc-border)',
          color: 'var(--kc-text-2)',
        }}
      >
        <TriggerIcon className="w-4 h-4" />
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
          aria-label="Theme options"
          className="kc-fade-in absolute right-0 mt-2 w-40 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            background: 'var(--kc-surface)',
            borderColor: 'var(--kc-border)',
          }}
        >
          {THEMES.map(({ value, label, Icon }) => {
            const selected = theme === value;
            return (
              <li key={value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setTheme(value);
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
                    <Icon className="w-4 h-4" />
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
