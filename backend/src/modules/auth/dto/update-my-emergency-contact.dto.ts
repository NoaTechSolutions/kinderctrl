import { IsIn, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

// PATCH /auth/me/emergency-contact — v6 supports primary + secondary
// contacts via the `slot` field. STAFF targets the Staff satellite's
// emergencyContact{,2}* columns; DIRECTOR / SUPER_ADMIN target the
// matching User columns (User gained emergencyContact2* in the v6
// migration). Same relationship whitelist + phone regex as the staff
// /me/profile DTO so contacts written through either flow validate
// identically.
export class UpdateMyEmergencyContactDto {
  // Slot picker. Required because the caller can target either contact
  // independently. Two = secondary (the "Emergency Contact 2" tab in
  // the UI). 1 maps to *Name / *Phone / *Relationship; 2 maps to
  // *2Name / *2Phone / *2Relationship at the service boundary.
  @IsInt()
  @IsIn([1, 2], { message: 'slot must be 1 or 2' })
  slot!: 1 | 2;


  @IsOptional()
  @IsString()
  @Length(0, 100)
  name?: string;

  // Empty string accepted so the user can clear the field. Service
  // converts '' → null before writing.
  @IsOptional()
  @IsString()
  @Matches(/^$|^\+?1?\d{10,14}$/, {
    message: 'Phone must be a valid US phone number',
  })
  phone?: string;

  // Same whitelist as Staff.emergencyContactRelationship validators —
  // free-text-with-allowlist so a Prisma enum change isn't needed when
  // PO adds a new option.
  @IsOptional()
  @IsIn([
    '',
    'father',
    'mother',
    'spouse',
    'partner',
    'sibling',
    'friend',
    'other',
  ])
  relationship?: string;
}
