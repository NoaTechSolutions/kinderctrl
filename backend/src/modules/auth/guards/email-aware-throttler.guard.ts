import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Defends against shared-IP collateral damage: the default tracker keys on
// req.ip alone, so two clients behind the same NAT (or two browsers on
// localhost) share one budget — a single attacker on one account trips the
// throttler for every legitimate user from that IP. We compose IP + email
// when the request carries an email in the body, restoring per-account
// isolation. Requests without an email (refresh, etc.) fall back to IP.
//
// Email is lowercased so casing variants ("a@x.com" vs "A@x.com") can't be
// used to bypass the per-(IP,email) budget. The DB-level lockout (PR2) still
// catches a true cross-IP brute-force on a single account.
@Injectable()
export class EmailAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const ip = (req?.ip as string) || 'unknown-ip';
    const rawEmail = req?.body?.email;
    if (typeof rawEmail === 'string' && rawEmail.trim()) {
      return Promise.resolve(`${ip}:${rawEmail.trim().toLowerCase()}`);
    }
    return Promise.resolve(ip);
  }
}
