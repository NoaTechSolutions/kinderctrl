// PO-approved copy (2026-05-20). The {Director Name} variable resolves to
// the Center owner's name (via center.owner.staff if linked, else owner's
// email as fallback) — even when the actual inviter is a SUPER_ADMIN, the
// invitee sees the Director responsible for their center.
export interface StaffInvitationTemplateParams {
  centerName: string;
  directorName: string;
  directorEmail: string;
  invitationUrl: string;
  expiresAt: Date;
}

export function staffInvitationTemplate({
  centerName,
  directorName,
  directorEmail,
  invitationUrl,
  expiresAt,
}: StaffInvitationTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    subject: `You're invited to join ${centerName} on KinderCtrl`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">You're invited to join ${centerName}</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">Hi there,</p>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          <strong>${directorName}</strong> has invited you to join the
          <strong>${centerName}</strong> team on KinderCtrl.
        </p>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          Complete your registration to get started:
        </p>
        <p style="margin: 28px 0;">
          <a href="${invitationUrl}" style="display: inline-block; background: #1f6feb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Complete Registration
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          This invitation expires on ${expiryDate}.
        </p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <p style="color: #111; font-size: 14px; margin: 0 0 6px 0;"><strong>What's KinderCtrl?</strong></p>
          <p style="color: #444; font-size: 14px; margin: 0;">
            KinderCtrl helps daycare centers manage staff, children, and daily operations.
          </p>
        </div>
        <p style="color: #444; font-size: 14px; line-height: 1.5;">
          Questions? Contact <a href="mailto:${directorEmail}">${directorEmail}</a> or reply to this email.
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          KinderCtrl Team<br/>
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `You're invited to join ${centerName} on KinderCtrl

Hi there,

${directorName} has invited you to join the ${centerName} team on KinderCtrl.

Complete your registration to get started:
${invitationUrl}

This invitation expires on ${expiryDate}.

What's KinderCtrl?
KinderCtrl helps daycare centers manage staff, children, and daily operations.

Questions? Contact ${directorEmail} or reply to this email.

---
KinderCtrl Team
If you didn't expect this invitation, you can safely ignore this email.`,
  };
}
