import type { ReactNode } from 'react';
import { LanguageDropdown } from '@/components/auth/language-dropdown';
import { ThemeDropdown } from '@/components/auth/theme-dropdown';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background relative">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeDropdown />
        <LanguageDropdown />
      </div>
      <aside
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, var(--kc-p-500), var(--kc-p-700))',
        }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'var(--kc-p-300)' }}
          />
          <div
            className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] rounded-full blur-3xl"
            style={{ background: 'var(--kc-p-800)' }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div className="font-display text-2xl tracking-tight">
            KinderCtrl
          </div>

          <div className="max-w-lg">
            <p
              className="font-mono text-xs uppercase tracking-widest opacity-80 mb-4"
              style={{ letterSpacing: '0.2em' }}
            >
              FOR DIRECTORS, STAFF AND FAMILIES
            </p>
            <h2 className="font-display text-5xl xl:text-6xl font-semibold leading-tight mb-2">
              Total control.
            </h2>
            <h2 className="font-display text-5xl xl:text-6xl font-semibold leading-tight mb-6 opacity-80">
              Complete peace.
            </h2>
            <p className="text-base xl:text-lg opacity-90 leading-relaxed">
              The all-in-one platform to run your daycare: attendance, daily
              reports, family communication and billing — all in one place.
            </p>
          </div>

          <div className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
            DAYCARES · SaaS
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 kc-safe-area">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 text-white font-display text-2xl shadow-lg mb-2">
              K
            </div>
            <div className="font-display text-xl tracking-tight">
              KinderCtrl
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
