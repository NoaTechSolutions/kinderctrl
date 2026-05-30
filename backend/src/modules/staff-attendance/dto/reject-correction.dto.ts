import { IsString, Length } from 'class-validator';

export class RejectCorrectionDto {
  @IsString()
  @Length(1, 500)
  directorComment: string;
}
