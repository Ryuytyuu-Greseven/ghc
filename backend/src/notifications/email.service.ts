import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getEmailLogoUrl, injectEmailLogo } from './email-logo.constants';
import type { EmailNotificationItem } from './notification-types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ?? 'noreply@ghc.health';
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn('SMTP_HOST not configured — emails will be skipped');
    }
  }

  async send(item: EmailNotificationItem): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Email skipped (SMTP not configured): ${item.subject} → ${item.to}`,
      );
      return false;
    }

    const html = injectEmailLogo(item.html);
    const logoUrl = getEmailLogoUrl();
    this.logger.debug(`Email logo URL: ${logoUrl}`);

    try {
      await this.transporter.sendMail({
        from: `GHC Portal <${this.fromAddress}>`,
        to: item.to,
        subject: item.subject,
        html,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${item.to}: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }
}
