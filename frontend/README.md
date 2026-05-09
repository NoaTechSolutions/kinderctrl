# KinderCtrl Frontend

Auth UI (Login + Signup) for KinderCtrl SaaS. Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Backend running at `http://localhost:3002` (see `../backend/`)
- PostgreSQL on port `5433`

### Setup

```powershell
cd frontend
npm install
```

`npm install` automatically generates the local `.env.local` is NOT created
by install — copy it from this template:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_DEFAULT_LOCALE=en
PORT=3003
```

### Development

```powershell
npm run dev
# Frontend at http://localhost:3003
```

### Production build

```powershell
npm run build
npm run start
```

---

## Folder layout

```
src/
├── app/
│   ├── (auth)/                Group layout for /login + /signup
│   │   ├── layout.tsx         Split-screen brand + form
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx     Protected placeholder
│   ├── layout.tsx             Root: fonts + Providers
│   ├── providers.tsx          QueryClient + I18n
│   ├── page.tsx               Root: redirect /login | /dashboard
│   └── globals.css            KC tokens + Tailwind v4 @theme + animations
├── components/
│   ├── ui/                    shadcn (Button, Input, Label, Card, Checkbox)
│   └── auth/
│       ├── password-strength.tsx
│       └── role-pills.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts          apiRequest + auto-refresh on 401
│   │   └── auth.ts            login / signup / me / logout
│   ├── i18n/
│   │   ├── translations.ts    EN + ES
│   │   ├── context.tsx        I18nProvider + useTranslation
│   │   └── index.ts
│   ├── schemas/auth.ts        zod schemas
│   ├── utils.ts               cn() helper
│   └── utils/password-strength.ts
└── store/auth.ts              Zustand: access in memory, refresh persisted
```

---

## Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI | shadcn/ui (new-york style) | latest |
| Icons | lucide-react | 1.x |
| Forms | react-hook-form + zod + @hookform/resolvers | 7 / 4 / 5 |
| Server state | TanStack Query | 5.x |
| Client state | Zustand | 5.x |
| i18n | Custom (Context + hook) | — |

Design tokens come from `../KinderCtrl-Docs/design/auth/kc-tokens.css` (oklch palette, hue 245).

---

## Auth model

- Backend issues **Bearer tokens** (access + refresh)
- `accessToken` lives **in memory** (Zustand) — lost on hard reload
- `refreshToken` + `user` are **persisted** to localStorage
- `apiRequest()` adds `Authorization: Bearer ${access}` automatically
- On 401 → auto-call `POST /auth/refresh`, retry the request
- On refresh failure → `clearTokens()` + throw `ApiError(401)`

`/login` and `/signup` are public. Everything else (e.g. `/dashboard`) checks the store and redirects to `/login` if no tokens after hydration.

---

## i18n

- Detection order: `localStorage('kc-locale')` → `navigator.language` → `en`
- Manual override: `useTranslation().setLocale('es')`
- Keys are flat (`t('welcome')`, not `t('login.welcome')`)
- Translation source: `src/lib/i18n/translations.ts`

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 3003 (webpack, hot reload) |
| `npm run build` | Production build |
| `npm run start` | Start the production build on port 3003 |
| `npm run lint` | ESLint |

---

## Design references

Design files live **outside** this repo at:

```
../KinderCtrl-Docs/design/auth/
├── kc-login.jsx          Pixel-perfect login (canvas component)
├── kc-signup.jsx         Pixel-perfect signup (canvas component)
├── kc-tokens.css         Design tokens (already integrated in globals.css)
├── kc-icons.jsx          Custom dashboard icons (Phase 2+)
└── KinderCtrl.html       Open in a browser to view artboards
```

Implementation prompts: `../KinderCtrl-Docs/prompts/PROMPT_DEV_FRONTEND.md`.

---

## Manual testing checklist

After `npm run dev` (with backend on :3002):

- [ ] `/` redirects to `/login` when no session
- [ ] `/login` with bad credentials → shake animation + inline error
- [ ] `/login` with valid credentials → success state → `/dashboard`
- [ ] `/signup` with strong password → checklist marks green, label "STRONG"
- [ ] `/signup` confirm mismatch → inline error on confirmPassword field
- [ ] `/signup` duplicate email → 409 → inline error on email field
- [ ] Reload `/dashboard` → session persists (refresh in localStorage rehydrates)
- [ ] Tab navigation works in logical order on both forms
- [ ] Focus ring visible on all interactive elements
- [ ] `aria-label`, `aria-invalid`, `aria-describedby` present (DevTools accessibility tab)
- [ ] Mobile viewports respect iOS safe areas

---

## Known limitations (Phase 1)

- `firstName` / `lastName` are accepted by the form but the backend silently
  discards them — they will be persisted via the future Staff/Parent module.
- `forgot password` link is a placeholder (`href="#"`).
- `/dashboard` is a placeholder; real dashboard ships in Phase 2.
- Dark mode tokens are in place but no toggle UI.
- Language selector only via auto-detect + `localStorage` override; no UI yet.
- No GitHub remote configured — commits are local-only.

These are intentional trade-offs documented in
`../KinderCtrl-Docs/prompts/DECISIONES_TECNICAS_PREVIAS.md`.
