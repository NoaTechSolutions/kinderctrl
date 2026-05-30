// Response of GET /staff/compliance-summary. Nested by domain so the UI can
// render two stacked widgets (Background Check + CPR) without re-aggregating
// on the client.
//
// PO QA #46/#49: both compliance domains now follow the same shape — counts
// per lifecycle state. BG: completedApproved / completedNotApproved /
// pending / cancelled. CPR: pending / active / expired / cancelled. The
// older "expiring within 60 days" CPR bucket was dropped along with the
// boolean `cprCertified` — admins move records to ACTIVE / EXPIRED
// explicitly now, no derived-from-date bucket.
export class BackgroundCheckSummaryDto {
  completedApproved: number;
  completedNotApproved: number;
  pending: number;
  cancelled: number;
}

export class CprSummaryDto {
  pending: number;
  active: number;
  expired: number;
  cancelled: number;
}

export class ComplianceSummaryDto {
  total: number;
  backgroundCheck: BackgroundCheckSummaryDto;
  cpr: CprSummaryDto;
}
