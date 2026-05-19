// Plain HTML kept minimal and inline. If templates grow past 3-4 we'll move
// to React Email, but for now inlining keeps the dependency footprint small
// and makes diffing easier in code review.
export interface PasswordResetTemplateParams {
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordResetTemplate({
  resetUrl,
  expiresInMinutes,
}: PasswordResetTemplateParams): { subject: string; html: string; text: string } {
  return {
    subject: 'Reset your KinderCtrl password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          You (or someone using your email) asked to reset your KinderCtrl password.
          Click the button below to choose a new one. The link expires in
          ${expiresInMinutes} minutes.
        </p>
        <p style="margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #1f6feb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          If the button doesn't work, paste this URL into your browser:<br/>
          <span style="word-break: break-all;">${resetUrl}</span>
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 32px;">
          If you didn't request this, you can ignore this email — your password won't change.
        </p>
      </div>
    `,
    text: `Reset your KinderCtrl password\n\nClick to choose a new one (expires in ${expiresInMinutes} minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}
