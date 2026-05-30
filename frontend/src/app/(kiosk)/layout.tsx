import type { ReactNode } from 'react';

export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--kc-bg)' }}>
      {children}
    </div>
  );
}
