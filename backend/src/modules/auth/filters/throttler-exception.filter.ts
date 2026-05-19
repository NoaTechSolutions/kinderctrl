import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthErrorCode } from '../constants/auth-error-code.enum';

// Default ThrottlerException returns a plain {statusCode, message}. We
// rewrite the body to match our typed-error shape so the frontend can
// branch on errorCode === 'RATE_LIMITED' the same way it branches on
// any other auth failure. retryAfter comes from the Retry-After header
// the throttler already sets (in seconds).
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const retryAfterHeader = response.getHeader('Retry-After');
    const retryAfter =
      typeof retryAfterHeader === 'string' || typeof retryAfterHeader === 'number'
        ? Number(retryAfterHeader)
        : undefined;

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      errorCode: AuthErrorCode.RATE_LIMITED,
      message: 'Too many requests. Please wait before trying again.',
      ...(retryAfter !== undefined && !Number.isNaN(retryAfter)
        ? { retryAfter }
        : {}),
    });
  }
}
