// Response shape of GET /staff/invitation/:token — the preview shown to the
// invitee on the registration page so they know what they're accepting.
// Intentionally omits role/centerId from the payload (frontend doesn't need
// them at this step, and they're already encoded in the token server-side).
export class InvitationInfoDto {
  email: string;
  centerName: string;
  // Resolved server-side: center.owner.staff.firstName+lastName if the
  // owner has a linked Staff record, else falls back to owner's email.
  directorName: string;
  directorEmail: string;
  expiresAt: Date;
}

// Computed lifecycle state of a StaffInvitationToken row (PO QA #13).
// PENDING:   actionable, awaiting invitee redemption.
// ACCEPTED:  invitee POSTed /staff/accept-invitation (usedAt set).
// EXPIRED:   never accepted, expiresAt passed.
// CANCELLED: inviter revoked it explicitly (cancelledAt set).
export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED';

// Response shape of GET /staff/invitations — list view for Director/
// SUPER_ADMIN. Each row carries a computed `status` discriminator so the
// frontend can render the status pill without re-deriving from timestamps.
// Replaces PendingInvitationDto from QA #12 3A.
export class InvitationDto {
  id: string;
  email: string;
  centerId: string;
  centerName: string;
  role: 'TEACHER' | 'ASSISTANT' | 'ADMIN';
  status: InvitationStatus;
  // Same resolution rule as InvitationInfoDto.directorName.
  invitedByName: string;
  invitedByEmail: string;
  createdAt: Date;
  expiresAt: Date;
  // Resend rate limit telemetry (PO QA #14 AJUSTE 3). The frontend uses
  // these to disable the Resend action and label the button with the
  // remaining attempts. resendCount only counts the active sliding-window
  // bucket — once lastResendAt drifts past 1h ago the counter is stale
  // and the next resend resets it to 1 server-side.
  resendCount: number;
  lastResendAt: Date | null;
}
