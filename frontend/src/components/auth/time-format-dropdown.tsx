'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTimeFormat,
  type TimeFormat,
} from '@/lib/preferences/time-format';

const OPTIONS: { code: TimeFormat; label: string; sample: string }[] = [
  { code: '24h', label: '24-hour', sample: '14:30' },
  { code: '12h', label: '12-hour', sample: '2:30 PM' },
];

export function TimeFormatDropdown() {
  const { timeFormat, setTimeFormat } = useTimeFormat();
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

  const current = OPTIONS.find((o) => o.code === timeFormat) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Time format: ${current.label}. Click to change`}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
        style={{
          background: 'var(--kc-surface)',
          borderColor: 'var(--kc-border)',
          color: 'var(--kc-text-2)',
        }}
      >
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {current.code === '24h' ? '24h' : '12h'}
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
          aria-label="Time format options"
          className="kc-fade-in absolute right-0 mt-2 w-48 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            background: 'var(--kc-surface)',
            borderColor: 'var(--kc-border)',
          }}
        >
          {OPTIONS.map(({ code, label, sample }) => {
            const selected = timeFormat === code;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setTimeFormat(code);
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
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{label}</span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'var(--kc-text-3)' }}
                    >
                      {sample}
                    </span>
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
