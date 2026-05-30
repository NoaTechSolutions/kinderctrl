import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

// PATCH /staff/me/profile — staff self-updates the optional profile fields
// they skipped during /accept-invitation. Any successful save flips
// profileComplete=true so the dashboard banner stops nagging them.
//
// All fields optional — Skip-for-now is a valid path. Address is stored
// as 4 discrete fields matching Center's pattern (PO QA #11).
export class UpdateProfileDto {
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  street?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  city?: string;

  // Same shape as Center.state — 2-letter uppercase. Optional, so empty
  // string skipped before validation runs (caller strips empties).
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'State must be 2 uppercase letters (e.g., CA, NY)',
  })
  state?: string;

  // Same shape as Center.zipCode — 5 digits or 5-4 form.
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'Invalid ZIP code (e.g., 94102 or 94102-1234)',
  })
  zipCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  emergencyContactName?: string;

  // Same US phone regex as the rest of the app (CreateStaffDto, etc.).
  // Optional so the invitee can leave it blank.
  @IsOptional()
  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, {
    message: 'Emergency contact phone must be a valid US phone number',
  })
  emergencyContactPhone?: string;

  // PO QA #31 — relationship + secondary contact also surfaced in
  // self-service /profile/complete so the staff can edit them later.
  @IsOptional()
  @IsIn([
    'father',
    'mother',
    'spouse',
    'partner',
    'sibling',
    'friend',
    'other',
  ])
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  emergencyContact2Name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, {
    message: 'Emergency contact phone must be a valid US phone number',
  })
  emergencyContact2Phone?: string;

  @IsOptional()
  @IsIn([
    'father',
    'mother',
    'spouse',
    'partner',
    'sibling',
    'friend',
    'other',
  ])
  emergencyContact2Relationship?: string;
}
