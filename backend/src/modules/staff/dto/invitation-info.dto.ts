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
