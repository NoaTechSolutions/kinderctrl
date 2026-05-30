import { IsString, MinLength } from 'class-validator';

export class VerifyPinDto {
  @IsString()
  @MinLength(4)
  pin: string;
}
