import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CprStatus } from '@prisma/client';

// PO QA #49: CPR moved to the BG-style explicit-status model. `certified`
// boolean dropped — status now carries the lifecycle phase. Auxiliary
// fields (certificationDate / expiryDate / provider / notes) are RETAINED
// per PO and stay optional. Service layer enforces:
//   ACTIVE  → expiryDate required AND in the future
//   EXPIRED → expiryDate required AND in the past (or today)
//   PENDING / CANCELLED → expiryDate optional, no temporal constraint
export class UpdateCprDto {
  @IsEnum(CprStatus)
  status: CprStatus;

  @IsOptional()
  @IsDateString()
  certificationDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  // Free text — typically "Red Cross", "American Heart Association", etc.
  @IsOptional()
  @IsString()
  @Length(0, 100)
  provider?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
