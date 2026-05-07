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

## Current Status

**Phase 1: Foundation** - In Progress

- [x] Project setup
- [ ] Auth module
- [ ] Users CRUD
- [ ] Centers CRUD

---

**Version:** 1.0.0
**Status:** In Development
**Started:** May 2026
