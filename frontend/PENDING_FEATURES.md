# Auth Module — Pending Features & Refinements

**Status:** Auth Module MVP completed
**Date:** May 9, 2026
**Branch:** `feature/auth-login-signup`

This document lists features identified as pending during the final audit. Nothing in this list is blocking the next module (Dashboard / Centers). Each item is scoped, prioritized, and estimated.

---

## Pending items

### Important — pre-production

#### 1. Forgot / Reset password flow

- **State:** UI placeholder (`href="#"`), not implemented end-to-end
- **Priority:** High (locked-out users have no recovery path)
- **Estimate:** 4–6 hours

**Frontend work:**
- `/forgot-password` page (email input + "send reset link")
- `/reset-password` page (new password + confirm, validates token from query string)

**Backend work:**
- `POST /auth/forgot-password` — accepts email, generates short-lived reset token, sends email
- `POST /auth/reset-password` — accepts token + new password, rotates session
- Email service wiring (NodeMailer or SendGrid; SendGrid env vars already in `.env.example`)

---

#### 2. "Remember me" functionality

- **State:** Checkbox captured in form state but ignored on submit
- **Priority:** Medium
- **Estimate:** 1–2 hours

**Suggested implementation:**
- Refresh token TTL: 30 days when `remember=true`, 7 days when `false`
- Backend: branch in `auth.service.generateTokens(user, options?)` based on the flag
- Frontend: pass `remember` through to the login API call

---

#### 3. `firstName` / `lastName` persistence

- **State:** Accepted by signup DTO, silently discarded by the backend (User model lacks the columns)
- **Priority:** Medium (needed for Staff / Parent module)
- **Estimate:** ~1 hour

**Path forward:** when Staff / Parent modules ship, persist these fields on the corresponding entity (`Staff.firstName/lastName`, `Parent.firstName/lastName`) and join into `/auth/me` response.

---

### Nice to have — legal / compliance

#### 4. Terms of Service page

- **State:** Footer link `href="#"`
- **Priority:** Low (until first external user)
- **Estimate:** 2–3 hours (mostly content + simple `/terms` page)

#### 5. Privacy Policy page

- **State:** Footer link `href="#"`
- **Priority:** Low
- **Estimate:** 2–3 hours

#### 6. Logout button visibility

- **State:** Button exists in `/dashboard` placeholder, no separate navigation
- **Priority:** Low
- **Estimate:** 30 minutes (style review when real dashboard ships)

---

## Backend security refinements (pre-production)

| # | Item | Estimate |
|---|---|---|
| S1 | bcrypt rounds 10 → 12 | 5 min |
| S2 | Session opaque token: `Math.random()` → `crypto.randomBytes(32).toString('hex')` | 10 min |
| S3 | Open registration → invitation flow (DIRECTOR creates Staff / Parent) | 3–4 h |
| S4 | Investigate `npm audit` (3 moderate warnings, never reviewed) | 30 min |

**Total: 4–5 hours**

---

## Operational — non-code

| # | Item | Notes |
|---|---|---|
| O1 | GitHub remote and `git push` | Branch is currently local-only |
| O2 | Multi-lockfile warning | Cosmetic; silence with `outputFileTracingRoot` in `next.config.ts` if it bothers |
| O3 | Lighthouse audit | Run after deploying to a real host, not localhost |

---

## Summary

| Item | Priority | Time | Blocking? |
|---|---|---|---|
| Forgot / Reset password | High | 4–6 h | No |
| Remember me | Medium | 1–2 h | No |
| firstName / lastName | Medium | ~1 h | No |
| Terms / Privacy | Low | 4–6 h | No |
| Logout visibility | Low | 0.5 h | No |
| Backend security S1-S4 | Medium | 4–5 h | Pre-prod |

**Total: ~15–20 hours** of additional auth work, none blocking.

---

## Recommended order

**Phase 2A (before any production deploy):**
1. Forgot / Reset password (#1)
2. Backend security refinements (S1, S2, S4)
3. Remember me (#2)

**Phase 2B (alongside Staff / Parent module):**
4. `firstName` / `lastName` persistence (#3)
5. Invitation flow (S3) — replaces open registration
6. Terms / Privacy pages (#4, #5)
7. Logout visibility review (#6)

---

## Conclusion

Core auth is 100% functional and signed off:

- Login + Signup with full validation
- Bearer token strategy with auto-refresh
- Session persistence
- i18n EN/ES (auto-detect + manual override)
- Theme Light/Dark/System (system follows OS)
- Animations, accessibility, iOS safe areas

All placeholders are deferred deliberately and documented above. The branch is ready to merge whenever the team decides; the next feature module (Dashboard / Centers UI) can start without depending on any of these items.
