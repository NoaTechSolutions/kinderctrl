import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class SetupKioskDto {
  @IsString()
  @MinLength(4)
  pin: string;

  @IsInt()
  @Min(1)
  @Max(60)
  timeoutMin: number = 2;
}
