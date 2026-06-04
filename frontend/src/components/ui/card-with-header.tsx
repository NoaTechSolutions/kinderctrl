import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Outlined card whose title is a compact badge that notches the top-left of the
// card border. The badge's `bg-card` matches the card surface so it integrates
// cleanly and masks the border segment behind it. Uses neutral design-system
// tokens (border/foreground/muted-foreground) — the notch is a style cue, not a
// color accent. Optional `action` (e.g. Edit) sits at the top-right corner.
interface CardWithHeaderProps {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Override the badge icon color (e.g. "text-green-500"). */
  iconClassName?: string;
  /** Override the badge title color (e.g. "text-green-500"). */
  titleClassName?: string;
  children: React.ReactNode;
}

export function CardWithHeader({
  icon: Icon,
  title,
  action,
  className,
  contentClassName,
  iconClassName,
  titleClassName,
  children,
}: CardWithHeaderProps) {
  return (
    <div className={cn('card-legend relative rounded-lg border border-border bg-card p-4 pt-6', className)}>
      {/* Title badge — notches the top border */}
      <div className="absolute -top-3 left-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5">
        {Icon && <Icon className={cn('h-3.5 w-3.5 text-muted-foreground', iconClassName)} aria-hidden />}
        <span className={cn('text-xs font-semibold uppercase tracking-wide text-foreground', titleClassName)}>
          {title}
        </span>
      </div>

      {/* Optional action (Edit, etc.) inside the card, top-right corner */}
      {action && (
        <div className="absolute top-2 right-3 z-10">{action}</div>
      )}

      <div className={cn(contentClassName)}>{children}</div>
    </div>
  );
}
