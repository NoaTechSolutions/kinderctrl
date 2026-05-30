import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

// Director action when reviewing a day or a week of attendance.
// Translates into the final `ApprovalStatus` stored on AttendanceApproval.
export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveOrRejectDayDto {
  @IsUUID()
  staffId!: string;

  @IsDateString()
  date!: string;

  @IsEnum(ApprovalAction)
  action!: ApprovalAction;

  // Required when REJECT — staff needs to know why their hours were rejected.
  @ValidateIf((o) => o.action === ApprovalAction.REJECT)
  @IsString()
  @Length(1, 500)
  directorComment?: string;
}

export class ApproveOrRejectWeekDto {
  @IsUUID()
  staffId!: string;

  // Monday of the week being approved/rejected (YYYY-MM-DD).
  @IsDateString()
  weekStart!: string;

  @IsEnum(ApprovalAction)
  action!: ApprovalAction;

  @ValidateIf((o) => o.action === ApprovalAction.REJECT)
  @IsString()
  @Length(1, 500)
  directorComment?: string;
}
