// Static HTML string for the instant app skeleton, injected via
// dangerouslySetInnerHTML in the Server Component root layout. Structural
// classes (.sk-bar / .sk-panel) are defined in SKELETON_CRITICAL_CSS, which is
// inlined in a <style> in the <head> — so the skeleton's visual styles are part
// of the initial CSSOM, before <body> is parsed. Colors come from the --sk-*
// vars THEME_INIT sets on <html> (theme-aware), with dark fallbacks.

// Critical CSS — inlined ahead of the skeleton markup so it paints with shape
// and color without waiting for the main CSS bundle. Scoped under
// #kc-initial-skeleton so it never leaks into the real app.
export const SKELETON_CRITICAL_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html.dark { --sk-bg:#0a0a0c; --sk-bar:rgba(255,255,255,0.28); --sk-border:rgba(255,255,255,0.15); --sk-panel:rgba(255,255,255,0.08); }
html.light { --sk-bg:#fafafa; --sk-bar:rgba(0,0,0,0.18); --sk-border:rgba(0,0,0,0.15); --sk-panel:rgba(0,0,0,0.07); }
html:not(.light):not(.dark) { --sk-bg:#0a0a0c; --sk-bar:rgba(255,255,255,0.28); --sk-border:rgba(255,255,255,0.15); --sk-panel:rgba(255,255,255,0.08); }
html { background: var(--sk-bg, #0a0a0c); }
#kc-initial-skeleton {
  position: fixed; inset: 0; z-index: 9999; display: flex;
  background: var(--sk-bg, #0a0a0c);
}
@keyframes kc-skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
#kc-initial-skeleton .sk-bar {
  background: var(--sk-bar, rgba(255,255,255,0.28));
  border-radius: 4px;
  animation: kc-skeleton-pulse 1.5s ease-in-out infinite;
}
#kc-initial-skeleton .sk-panel {
  background: var(--sk-panel, rgba(255,255,255,0.08));
  border: 1px solid var(--sk-border, rgba(255,255,255,0.15));
}
body.hydrated #kc-initial-skeleton {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
@media (max-width: 1023px) {
  #kc-initial-skeleton .kc-sk-sidebar { display: none; }
}
`;

const BORDER = 'var(--sk-border, rgba(255,255,255,0.15))';
const PANEL = 'var(--sk-panel, rgba(255,255,255,0.08))';

function bar(w: string, h: number, opts: { r?: number; circle?: boolean } = {}): string {
  const radius = opts.circle ? 'border-radius:50%;' : opts.r ? `border-radius:${opts.r}px;` : '';
  return `<div class="sk-bar" style="width:${w};height:${h}px;${radius}flex:none;"></div>`;
}

function navRow(textW: number): string {
  return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;">${bar('18px', 18)}${bar(`${textW}px`, 14)}</div>`;
}

export function getSkeletonHtml(): string {
  const navItems = Array.from({ length: 8 }).map(() => navRow(120)).join('');
  const footerItems = [navRow(90), navRow(70)].join('');

  const statCards = Array.from({ length: 4 })
    .map(
      () =>
        `<div class="sk-panel" style="border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px;">${bar('96px', 16)}${bar('64px', 32, { r: 6 })}</div>`,
    )
    .join('');

  const tableRows = Array.from({ length: 5 }).map(() => bar('100%', 56, { r: 6 })).join('');

  return `
    <!-- Sidebar (desktop only — hidden <lg via critical CSS) -->
    <div class="kc-sk-sidebar" style="width:224px;flex:none;border-right:1px solid ${BORDER};background:${PANEL};padding:16px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;margin-bottom:16px;">
        ${bar('32px', 32, { r: 8 })}${bar('104px', 18)}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex:1;">${navItems}</div>
      <div style="display:flex;flex-direction:column;gap:4px;padding-top:16px;border-top:1px solid ${BORDER};">${footerItems}</div>
    </div>

    <!-- Main column -->
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
      <!-- Topbar -->
      <div style="height:64px;flex:none;border-bottom:1px solid ${BORDER};background:${PANEL};display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:0 24px;">
        ${bar('32px', 32, { circle: true })}
        ${bar('80px', 32, { r: 6 })}
        <div style="display:flex;align-items:center;gap:8px;">
          ${bar('36px', 36, { circle: true })}
          <div style="display:flex;flex-direction:column;gap:6px;">${bar('110px', 12)}${bar('64px', 10)}</div>
        </div>
      </div>

      <!-- Content -->
      <div style="flex:1;overflow:hidden;padding:24px;">
        <div style="max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:24px;">
          <div style="display:flex;flex-direction:column;gap:8px;">${bar('240px', 28, { r: 6 })}${bar('160px', 16)}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">${statCards}</div>
          <div class="sk-panel" style="border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;">${bar('100%', 40, { r: 6 })}${tableRows}</div>
        </div>
      </div>
    </div>
  `;
}
