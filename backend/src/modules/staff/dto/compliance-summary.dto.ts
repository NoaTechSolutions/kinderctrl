// Response of GET /staff/compliance-summary. Nested by domain so the UI can
// render two stacked widgets (Background Check + CPR) without re-aggregating
// on the client. Status names match the BackgroundCheckStatus enum lowercase-
// camelCased; CPR slices are derived (no enum) — see ComplianceSummary.cpr.
export class BackgroundCheckSummaryDto {
  approved: number;
  pending: number;
  notStarted: number;
  rejected: number;
  expired: number;
}

export class CprSummaryDto {
  // certified && (no expiry OR expiry > now + 60d). "Valid right now."
  valid: number;
  // certified && expiry in [now, now+60d]. "Action needed soon."
  expiring: number;
  // certified && expiry <= now. "Action needed yesterday."
  expired: number;
  // !certified. Treated as a category rather than rolled into 'expired' so
  // the UI can show distinct copy ("Get certified" vs "Renew certification").
  missing: number;
}

export class ComplianceSummaryDto {
  total: number;
  backgroundCheck: BackgroundCheckSummaryDto;
  cpr: CprSummaryDto;
}
