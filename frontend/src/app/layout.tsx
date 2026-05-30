import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { getSkeletonHtml, SKELETON_CRITICAL_CSS } from '@/lib/skeleton-html';
import './globals.css';

// Applies the persisted theme to <html> synchronously during HTML parse —
// BEFORE first paint and before React hydrates. Without this, the theme class
// is only added by ThemeProvider's useEffect (post-hydration), so a dark-mode
// user gets a flash of the light `:root` background. Mirrors theme/context.tsx
// EXACTLY: key `kc-theme`, default `system` (resolved via matchMedia), class
// `.light`/`.dark`. Also sets color-scheme + an instant html background, plus
// the --sk-* tokens the InitialSkeleton uses so it has visible, theme-correct
// shape even before the CSS bundle loads.
const THEME_INIT = `(function(){try{
  var t = localStorage.getItem('kc-theme');
  if (t !== 'light' && t !== 'dark' && t !== 'system') t = 'system';
  var d = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  var el = document.documentElement;
  el.classList.remove('light','dark');
  el.classList.add(d);
  el.style.colorScheme = d;
  var s = el.style;
  if (d === 'dark') {
    s.background = '#0a0a0c';
    s.setProperty('--sk-bg', '#0a0a0c');
    s.setProperty('--sk-panel', 'rgba(255,255,255,0.08)');
    s.setProperty('--sk-bar', 'rgba(255,255,255,0.28)');
    s.setProperty('--sk-border', 'rgba(255,255,255,0.15)');
  } else {
    s.background = '#fafafa';
    s.setProperty('--sk-bg', '#fafafa');
    s.setProperty('--sk-panel', 'rgba(0,0,0,0.07)');
    s.setProperty('--sk-bar', 'rgba(0,0,0,0.18)');
    s.setProperty('--sk-border', 'rgba(0,0,0,0.15)');
  }
}catch(e){}})();`;

// Hides the instant skeleton on non-dashboard routes (login, kiosk, etc.)
// synchronously during parse, so the dashboard-shaped skeleton never flashes
// there. Dashboard routes keep it until React commits (Providers adds
// `body.hydrated`, which cross-fades it out).
const SKELETON_GATE = `(function(){try{
  var p = location.pathname;
  if (/^\\/(login|signup|forgot-password|reset-password|accept-invitation|verify|kiosk|kiosk-reset)(\\/|$)/.test(p)) {
    document.body.classList.add('hydrated');
  }
}catch(e){}})();`;

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KinderCtrl',
  description: 'Daycare management platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Critical CSS in the <head> so the skeleton's shape + color are part
            of the initial CSSOM, before <body> is parsed. In dev (where
            globals.css is JS-injected, not a render-blocking <link>) this lets
            the skeleton paint immediately. See note in chat re: prod. */}
        <style dangerouslySetInnerHTML={{ __html: SKELETON_CRITICAL_CSS }} />
        {/* Theme applied before first paint — runs during <head> parse, before
            the body, so a dark-mode user never sees a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
        // Suppress hydration mismatch caused by browser extensions that
        // inject body attributes (ColorZilla → `cz-shortcut-listen`,
        // Grammarly → `data-gr-*`, etc.). Scope limited to <body> so any
        // real hydration bugs in the app shell still surface.
        suppressHydrationWarning
      >
        {/* Hide the skeleton instantly on non-dashboard routes. Must run in the
            body (needs document.body to exist). */}
        <script dangerouslySetInnerHTML={{ __html: SKELETON_GATE }} />
        {/* Instant skeleton — pure static HTML in the first byte of the SSR
            response, never touched by React hydration. Styled by the critical
            CSS in <head>; hidden once React commits (body.hydrated). */}
        <div
          id="kc-initial-skeleton"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getSkeletonHtml() }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
