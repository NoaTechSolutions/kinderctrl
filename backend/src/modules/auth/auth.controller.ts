import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { SkipSetupCheck } from '../centers/decorators/skip-setup-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 3 registrations per IP per hour. Real B2B signup is rare; this kills
  // automated account creation without affecting legitimate use.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  // 5 login attempts per IP per 15 min. Matches the account-lockout
  // threshold (PR2) so a sustained brute-force trips the throttler before
  // it even reaches the DB lockout — defense in depth.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  // 30 refreshes per IP per minute. Refresh is per-session machinery; a
  // legitimate client triggers it on token expiry, not in a loop. Keeps
  // misbehaving clients (or accidental retry storms) bounded.
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser() user: { id: string; sessionId: string },
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(user.id, user.sessionId);
  }

  // 3/hour per IP — anti-spam for reset emails (each one costs us money +
  // Resend reputation). Returns 202 regardless of whether the email exists,
  // so the response body intentionally carries no data.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authService.forgotPassword(dto);
  }

  // 5/15min per IP — same window/limit as login, since this is the
  // mirror failure surface (guessing valid tokens).
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: { sessionId: string }): Promise<void> {
    return this.authService.logout(user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }
}
