import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

// PATCH /auth/me/profile — unified self-update for the Profile module.
// All fields optional so the modal can submit a partial diff. The service
// route-dispatches by role: STAFF writes to Staff, DIRECTOR / SUPER_ADMIN
// write to User (PARENT will follow). Email + password are handled by
// dedicated endpoints because they each carry a destructive side effect
// (session revoke / re-login).
//
// v3: address fields (street, city, state, zipCode) added. Same patterns
// as Staff.address column shapes so the dispatch routes can pass values
// through unchanged.
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'First name must be between 1 and 100 characters',
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Last name must be between 1 and 100 characters',
  })
  lastName?: string;

  // Same US phone regex as the rest of the app (CreateStaffDto,
  // UpdateProfileDto). Empty string handled by the service so the user
  // can clear the field.
  @IsOptional()
  @IsString()
  @Matches(/^$|^\+?1?\d{10,14}$/, {
    message: 'Phone must be a valid US phone number',
  })
  phone?: string;

  // Address — empty strings collapse to null at the service so the user
  // can clear individual pieces. Validators match Staff.* + Center.*
  // shapes exactly so a payload that round-trips through any of the
  // three doesn't drift.
  @IsOptional()
  @IsString()
  @Length(0, 200)
  street?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^[A-Z]{2}$/, {
    message: 'State must be 2 uppercase letters (e.g., CA, NY)',
  })
  state?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^\d{5}(-\d{4})?$/, {
    message: 'Invalid ZIP code (e.g., 94102 or 94102-1234)',
  })
  zipCode?: string;

  // v14: STAFF-only field. Service silently ignores it for any other
  // role (no User column exists for DOB). Empty string isn't accepted
  // by IsDateString — frontend must transform "" → undefined before
  // submitting (matches the same convention as the existing staff
  // /me/profile DTO).
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
