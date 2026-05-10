import { SetMetadata } from '@nestjs/common';

export const SKIP_SETUP_CHECK = 'skipSetupCheck';
export const SkipSetupCheck = () => SetMetadata(SKIP_SETUP_CHECK, true);
