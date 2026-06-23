import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CHILD_TOILET_HELP_LEVELS } from '../children.constants';

// Children Fase 2 (2B) — input for PATCH /children/:id/development. Partial
// MERGE upsert: every field is optional, and each of the three edit tabs
// (Development / Routines / Toilet) sends only ITS fields. Omitted fields are
// left untouched (Prisma ignores `undefined`); the service does NOT coalesce to
// null, so the other tabs' columns survive a per-tab save. Groups the three
// logical sections that all live on the single ChildDevelopment satellite.
//
// "HH:mm" 24h clock-time strings — same shape the codebase already uses for
// CenterHours / ScheduleDay times. The regex rejects anything that isn't a
// valid 00:00–23:59.
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateDevelopmentDto {
  // ── DESARROLLO — milestones (months) + notes ──────────────────────────────

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  walkedAtMonths?: number;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  talkedAtMonths?: number;

  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  toiletTrainedAtMonths?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  developmentNotes?: string;

  // ── RUTINAS DIARIAS ───────────────────────────────────────────────────────

  @IsString()
  @Matches(TIME_HHMM, { message: 'wakeUpTime must be HH:mm' })
  @IsOptional()
  wakeUpTime?: string;

  @IsString()
  @Matches(TIME_HHMM, { message: 'bedTime must be HH:mm' })
  @IsOptional()
  bedTime?: string;

  @IsBoolean()
  @IsOptional()
  takesNap?: boolean;

  @IsString()
  @Matches(TIME_HHMM, { message: 'napStartTime must be HH:mm' })
  @IsOptional()
  napStartTime?: string;

  @IsString()
  @Matches(TIME_HHMM, { message: 'napEndTime must be HH:mm' })
  @IsOptional()
  napEndTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  diet?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  mealTimes?: string;

  // Fase 2 (2D) — A5 gaps. sleepsWell is tri-state (null = unanswered).
  @IsBoolean()
  @IsOptional()
  sleepsWell?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  eatingProblems?: string;

  // ── TOILET / BAÑO ─────────────────────────────────────────────────────────

  @IsBoolean()
  @IsOptional()
  toiletTrained?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  toiletWordBowel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  toiletWordUrination?: string;

  @IsIn(CHILD_TOILET_HELP_LEVELS)
  @IsOptional()
  toiletHelpLevel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  toiletAccidents?: string;

  // Fase 2 (2D) — A6 gaps. bowelMovementsRegular is tri-state (null = unanswered).
  @IsBoolean()
  @IsOptional()
  bowelMovementsRegular?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  bowelMovementTime?: string;
}
