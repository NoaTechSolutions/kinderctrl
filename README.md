# KinderCtrl

SaaS platform for daycare/preschool management.

## Project Structure

- `backend/` - NestJS API server (PRIMARY FOCUS)
- `frontend/` - Next.js web application (coming soon)
- `mobile/` - React Native mobile app (coming later)

## Tech Stack

**Backend:**
- NestJS 11.x + TypeScript 5.x
- Prisma ORM + PostgreSQL (Neon)
- Redis 7.x (Upstash) - cache/queue
- Stripe Connect - payments
- SendGrid - email
- Twilio - SMS
- Firebase FCM - push notifications

**Frontend:**
- Next.js 14.x (App Router)
- React 18.x + TypeScript
- TailwindCSS 3.x + Zustand

## Documentation

Full documentation: `../KinderCtrl-Docs/`

### Design and references

Design files live outside this repo at `../KinderCtrl-Docs/design/auth/`:

- `kc-login.jsx` — Login page (pixel-perfect reference)
- `kc-signup.jsx` — Signup page
- `kc-tokens.css` — Design tokens (colors, fonts, spacing)
- `kc-icons.jsx` — Custom icons
- `KinderCtrl.html` — Designer canvas (open in a browser to view)
- `design-canvas.jsx` — Canvas helper

Implementation prompts live at `../KinderCtrl-Docs/prompts/`.

To view the design canvas in a browser:

```powershell
cd ..\KinderCtrl-Docs\design\auth
start KinderCtrl.html
```

### Current phase status

- [x] Project setup
- [x] Auth module (JWT + sessions, multi-device logout)
- [x] Centers module (CRUD + multi-tenancy + ownership guard)
- [ ] Frontend scaffold (Next.js 15 + Tailwind + shadcn/ui)
- [ ] Login + Signup pages

## Architecture

- **Type:** Modular Monolith
- **Multi-tenant:** By `center_id`
- **Auth:** JWT with refresh tokens
- **Roles:** `admin`, `director`, `staff`, `parent`

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

---

**Version:** 1.0.0
**Status:** In Development
**Started:** May 2026
