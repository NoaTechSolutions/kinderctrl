import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class InviteStaffDto {
  // Email of the person being invited. Lowercased server-side before lookup
  // so casing variants can't slip past the "one active invite per email" rule.
  @IsEmail()
  email: string;

  // Optional for DIRECTOR (auto-derived from user.centerId); REQUIRED for
  // SUPER_ADMIN (validated in the service). The schema-level check rejects
  // malformed UUIDs early.
  @IsOptional()
  @IsUUID()
  centerId?: string;
}
