import { IsString, IsUUID, Matches } from 'class-validator';

export class VerifyStaffPinDto {
  @IsUUID()
  staffId: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
