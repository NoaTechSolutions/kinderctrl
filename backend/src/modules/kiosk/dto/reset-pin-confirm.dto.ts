import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPinConfirmDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  newPin: string;
}
