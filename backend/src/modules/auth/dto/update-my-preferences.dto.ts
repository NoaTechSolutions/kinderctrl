import { IsIn, IsString } from 'class-validator';

// PATCH /auth/me/preferences — server-persisted user preferences.
// v2 ships timeFormat only; theme + language stay client-side (no
// cross-device need, no first-paint requirement). If we ever persist
// either, add fields here and the migration follows the same pattern.
//
// Wire shape uses the FRONTEND values ('12h' / '24h') instead of the
// Prisma enum (TWELVE_HOUR / TWENTY_FOUR_HOUR) — the service maps at
// the boundary so client code stays compact and the localStorage key
// (kc-time-format) matches the wire value verbatim.
export class UpdateMyPreferencesDto {
  @IsString()
  @IsIn(['12h', '24h'], {
    message: "timeFormat must be '12h' or '24h'",
  })
  timeFormat!: '12h' | '24h';
}
