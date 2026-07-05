import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio;
  private readonly logger = new Logger(TwilioService.name);
  private twilioPhoneNumber: string;
  private twilioWhatsAppNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    // We'll optionally load the numbers from env, or fallback if not provided
    this.twilioPhoneNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
    this.twilioWhatsAppNumber =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || '';

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn(
        'Twilio credentials not found in environment variables. TwilioService will not be able to send messages.',
      );
    }
  }

  /**
   * Send an SMS message using Twilio
   * @param to The recipient's phone number
   * @param body The content of the message
   * @returns The sent message object or null if failed
   */
  async sendSms(to: string, body: string): Promise<any> {
    if (!this.client) {
      this.logger.error('Cannot send SMS: Twilio client is not initialized.');
      throw new Error('Twilio client is not initialized');
    }

    try {
      const message = await this.client.messages.create({
        body,
        from: this.twilioPhoneNumber,
        to,
      });
      this.logger.log(`SMS sent successfully to ${to}. SID: ${message.sid}`);
      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a WhatsApp message using Twilio
   * @param to The recipient's WhatsApp number (e.g., 'whatsapp:+1234567890' or just '+1234567890' and we will prepend it)
   * @param body The content of the message
   * @returns The sent message object or null if failed
   */
  async sendWhatsApp(to: string, body: string): Promise<any> {
    if (!this.client) {
      this.logger.error(
        'Cannot send WhatsApp: Twilio client is not initialized.',
      );
      throw new Error('Twilio client is not initialized');
    }

    // Ensure the 'whatsapp:' prefix is present
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = this.twilioWhatsAppNumber.startsWith('whatsapp:')
      ? this.twilioWhatsAppNumber
      : `whatsapp:${this.twilioWhatsAppNumber}`;

    try {
      const message = await this.client.messages.create({
        body,
        from: formattedFrom,
        to: formattedTo,
      });
      this.logger.log(
        `WhatsApp message sent successfully to ${formattedTo}. SID: ${message.sid}`,
      );
      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp to ${formattedTo}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
