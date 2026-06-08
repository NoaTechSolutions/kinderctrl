import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// Children Fase 2 (2C) — input for PATCH /children/:id/personality. Partial
// MERGE upsert: every field is optional; an omitted field is left untouched
// (Prisma ignores undefined), an explicit null clears it. All free text +
// one boolean, matching the ChildPersonality satellite.
export class UpdatePersonalityDto {
  @IsString() @IsOptional() @MaxLength(300) personalityWords?: string;
  @IsString() @IsOptional() @MaxLength(1000) likesToDo?: string;
  @IsString() @IsOptional() @MaxLength(500) favoriteFoods?: string;
  @IsString() @IsOptional() @MaxLength(500) dislikedFoods?: string;
  @IsString() @IsOptional() @MaxLength(500) fears?: string;
  @IsString() @IsOptional() @MaxLength(300) favoriteIndoorActivity?: string;
  @IsString() @IsOptional() @MaxLength(300) favoriteOutdoorActivity?: string;
  @IsString() @IsOptional() @MaxLength(300) favoriteToy?: string;

  @IsBoolean() @IsOptional() napsAtHome?: boolean;
  @IsString() @IsOptional() @MaxLength(100) napTimeAtHome?: string;

  @IsString() @IsOptional() @MaxLength(2000) expressesEmotions?: string;
  @IsString() @IsOptional() @MaxLength(2000) homeDiscipline?: string;
  @IsString() @IsOptional() @MaxLength(2000) getsAlongWith?: string;
  @IsString() @IsOptional() @MaxLength(2000) groupPlayExperience?: string;
  @IsString() @IsOptional() @MaxLength(2000) sickCarePlan?: string;
  @IsString() @IsOptional() @MaxLength(2000) transitionTips?: string;
  @IsString() @IsOptional() @MaxLength(2000) anythingElse?: string;
}
