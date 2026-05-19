export function accountUnlockedTemplate(): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: 'Your KinderCtrl account was unlocked',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">Your account was unlocked</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          An administrator manually unlocked your KinderCtrl account. You can
          sign in again.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 32px;">
          If you didn't expect this — or you didn't contact support — let us
          know right away.
        </p>
      </div>
    `,
    text: `Your KinderCtrl account was unlocked\n\nAn administrator manually unlocked your account. You can sign in again.\n\nIf you didn't expect this, let us know.`,
  };
}
