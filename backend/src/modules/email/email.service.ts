import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client: Resend;
  private readonly fromEmail: string;
  // When set, overrides every `to` so dev/staging emails land in a single
  // mailbox instead of real users. Production should leave it empty so the
  // real recipient is used.
  private readonly devTargetOverride?: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      // Don't throw at boot — auth still works without email. The send()
      // path warns + no-ops so a missing key is loud but not crashing.
      this.logger.warn(
        'RESEND_API_KEY not set; emails will be skipped (logged-only).',
      );
    }
    this.client = new Resend(apiKey ?? 'dummy-key');
    this.fromEmail =
      this.config.get<string>('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
    this.devTargetOverride = this.config.get<string>('RESEND_TO_EMAIL');
  }

  async send(params: SendEmailParams): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `Skipping email to=${params.to} subject="${params.subject}" — no API key.`,
      );
      return;
    }

    const effectiveTo = this.devTargetOverride ?? params.to;
    const subjectPrefix = this.devTargetOverride
      ? `[dev → ${params.to}] `
      : '';

    try {
      const result = await this.client.emails.send({
        from: this.fromEmail,
        to: effectiveTo,
        subject: subjectPrefix + params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
      });
      if (result.error) {
        this.logger.error(
          `Resend rejected email to=${effectiveTo}: ${JSON.stringify(result.error)}`,
        );
        throw new Error(`Email send failed: ${result.error.message}`);
      }
    } catch (err) {
      // Log with structured context so a future audit can trace which
      // email failed without leaking the user's address into prod logs.
      this.logger.error(
        `Email send failed (originally to=${params.to}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
