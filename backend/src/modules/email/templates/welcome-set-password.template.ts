// Welcome email sent when a SUPER_ADMIN creates a staff record manually
// (PO QA #30 Opción E). Same underlying token type as password reset —
// the URL just carries `?welcome=1` so the reset-password page shows
// "Welcome — set your password" copy instead of "Reset your password".
// Inviter is shown so the recipient knows whose account they're
// activating (helps avoid the "is this phishing?" confusion that comes
// from a generic password email).
export interface WelcomeSetPasswordTemplateParams {
  setupUrl: string;
  expiresInDays: number;
  inviterName: string;
  centerName: string;
}

export function welcomeSetPasswordTemplate({
  setupUrl,
  expiresInDays,
  inviterName,
  centerName,
}: WelcomeSetPasswordTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `Welcome to KinderCtrl — set your password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Welcome to KinderCtrl</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          ${inviterName} added you as a staff member at <strong>${centerName}</strong>.
          Click the button below to set your password and start using KinderCtrl.
          The link expires in ${expiresInDays} days.
        </p>
        <p style="margin: 32px 0;">
          <a href="${setupUrl}" style="display: inline-block; background: #1f6feb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Set your password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          If the button doesn't work, paste this URL into your browser:<br/>
          <span style="word-break: break-all;">${setupUrl}</span>
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 32px;">
          If you weren't expecting this email, please contact ${inviterName} —
          they can revoke the account from KinderCtrl.
        </p>
      </div>
    `,
    text: `Welcome to KinderCtrl\n\n${inviterName} added you as a staff member at ${centerName}. Set your password (expires in ${expiresInDays} days):\n${setupUrl}\n\nIf you weren't expecting this, contact ${inviterName}.`,
  };
}
