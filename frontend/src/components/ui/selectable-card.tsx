import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SelectableCardProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  selected?: boolean;
  icon?: LucideIcon;
  label: string;
  description?: string;
}

function SelectableCard({
  selected = false,
  icon: Icon,
  label,
  description,
  className,
  ...props
}: SelectableCardProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg text-left transition-colors',
        className,
      )}
      style={{
        border: selected ? '2px solid var(--kc-p-600)' : '1px solid var(--kc-border)',
        background: selected ? 'color-mix(in srgb, var(--kc-p-600) 10%, transparent)' : 'var(--kc-bg)',
        padding: selected ? '11px' : '12px',
      }}
      {...props}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className="h-4 w-4"
            style={{ color: selected ? 'var(--kc-p-600)' : 'var(--kc-text-3)' }}
          />
        )}
        <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {label}
        </span>
      </div>
      {description && (
        <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          {description}
        </span>
      )}
    </button>
  );
}

export { SelectableCard };
export type { SelectableCardProps };
