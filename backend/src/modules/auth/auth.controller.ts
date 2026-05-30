import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateMyEmailDto } from './dto/update-my-email.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { UpdateMyPreferencesDto } from './dto/update-my-preferences.dto';
import { UpdateMyEmergencyContactDto } from './dto/update-my-emergency-contact.dto';
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

  // ──────────────────────────────────────────────────────────────────
  // /profile module endpoints (Issue #6).
  //  - GET me/profile: read unified profile (firstName/lastName/phone +
  //    email + role). Allowed pre-setup (@SkipSetupCheck) so a user
  //    landing on /profile before completing center setup still sees
  //    their identity.
  //  - PATCH me/profile: update firstName/lastName/phone.
  //  - PATCH me/email: change email; requires currentPassword; revokes
  //    all sessions on success (client must clear local tokens + redirect).
  //  - PATCH me/password: change password; requires currentPassword;
  //    revokes all sessions on success.
  // ──────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getMyProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Patch('me/profile')
  async updateMyProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.authService.updateMyProfile(user.id, dto);
  }

  // 5/15min per IP — destructive action with bcrypt cost on every call.
  // Same window/limit as login. Throttler prevents both brute-force
  // attempts on currentPassword and accidental retry storms.
  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Patch('me/email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMyEmail(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyEmailDto,
  ): Promise<void> {
    return this.authService.updateMyEmail(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMyPassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangeMyPasswordDto,
  ): Promise<void> {
    return this.authService.changeMyPassword(user.id, dto);
  }

  // Profile v2 — preferences + emergency contact. Both return the
  // updated profile so the React Query cache can seed the next render
  // without a follow-up GET. No throttler — non-destructive, no
  // bcrypt cost.

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Patch('me/preferences')
  async updateMyPreferences(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyPreferencesDto,
  ) {
    return this.authService.updateMyPreferences(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipSetupCheck()
  @Patch('me/emergency-contact')
  async updateMyEmergencyContact(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMyEmergencyContactDto,
  ) {
    return this.authService.updateMyEmergencyContact(user.id, dto);
  }
}
