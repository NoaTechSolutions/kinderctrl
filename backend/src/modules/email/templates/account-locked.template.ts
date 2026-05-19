export interface AccountLockedTemplateParams {
  // Localized expiry timestamp ("at 14:32") — formatted upstream so the
  // template stays presentation-only.
  unlocksAtText: string;
  // Optional URL to the password reset page — if provided, the email
  // surfaces a "wasn't me, reset my password" CTA.
  resetUrl?: string;
}

export function accountLockedTemplate({
  unlocksAtText,
  resetUrl,
}: AccountLockedTemplateParams): { subject: string; html: string; text: string } {
  const resetCta = resetUrl
    ? `
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Wasn't me — reset password
          </a>
        </p>
      `
    : '';
  const resetText = resetUrl
    ? `\n\nIf it wasn't you, reset your password right away:\n${resetUrl}`
    : '';

  return {
    subject: 'Your KinderCtrl account was locked',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Your account was locked</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          We locked your KinderCtrl account because of too many failed login
          attempts. It will unlock automatically <strong>${unlocksAtText}</strong>.
        </p>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          If this was you (you forgot the password), you can wait it out — or
          reset your password now and skip the wait.
        </p>
        ${resetCta}
        <p style="color: #888; font-size: 13px; margin-top: 32px;">
          If you didn't try to sign in, someone else is. Reset your password
          immediately and consider rotating it elsewhere if you reuse it.
        </p>
      </div>
    `,
    text: `Your KinderCtrl account was locked\n\nWe locked your account due to too many failed login attempts. It unlocks ${unlocksAtText}.${resetText}`,
  };
}
