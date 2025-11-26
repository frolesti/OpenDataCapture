import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Using credentials from environment variables
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER || 'suport.alta.medical@gmail.com',
        pass: process.env.MAIL_PASSWORD
      }
    });
  }

  async sendForgotPasswordEmail(identifier: string) {
    const contactEmail = process.env.CONTACT_EMAIL || 'suport.alta.medical@gmail.com';

    const mailOptions = {
      from: '"Alta Medical Services" <noreply@altamedicalservices.com>',
      to: contactEmail,
      subject: `Password Reset Request: ${identifier}`,
      text: `The user with username or email '${identifier}' has requested a password reset. Please contact them or reset their password manually.`
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Forgot password email sent for user ${identifier} to ${contactEmail}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      throw error;
    }
  }
}
