import fs from 'node:fs';
import path from 'node:path';

import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

import { readMailTemplate, renderWelcomeEmail, type WelcomeEmailData } from './welcome-email';

@Injectable()
export class OnboardingMailService {
  private readonly logger = new Logger(OnboardingMailService.name);
  private readonly hasMailConfig: boolean;
  private readonly transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor() {
    const mailHost = process.env.MAIL_HOST?.trim();
    const mailUser = process.env.MAIL_USER?.trim();
    const mailPassword = process.env.MAIL_PASSWORD?.trim();

    this.hasMailConfig = Boolean(mailHost && mailUser && mailPassword);
    if (!this.hasMailConfig) {
      this.logger.warn(
        'SMTP config missing: MAIL_HOST, MAIL_USER and MAIL_PASSWORD are required to send onboarding email'
      );
    }

    const smtpPort = Number(process.env.MAIL_PORT ?? 587);
    const smtpSecure = process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : smtpPort === 465;
    const tlsServerName = process.env.MAIL_TLS_SERVERNAME ?? mailHost;
    const rejectUnauthorized = process.env.MAIL_TLS_REJECT_UNAUTHORIZED
      ? process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
      : true;

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: Number.isNaN(smtpPort) ? 587 : smtpPort,
      requireTLS: !smtpSecure,
      secure: smtpSecure,
      auth: {
        pass: mailPassword,
        user: mailUser
      },
      tls: {
        rejectUnauthorized,
        servername: tlsServerName
      }
    });
  }

  async sendWelcomeEmail({ email, ...data }: WelcomeEmailData & { email: string }) {
    const html = this.renderTemplate(data);

    const mailOptions: nodemailer.SendMailOptions = {
      bcc: (process.env.MAIL_AUDIT_BCC ?? process.env.MAIL_USER ?? '').trim() || undefined,
      from: process.env.MAIL_FROM ?? '"Alta Medical Services" <info@altamedicalservices.com>',
      to: email,
      html,
      subject: 'Credenciales de acceso a Alta Medical Services'
    };

    mailOptions.attachments = [this.logoAttachment()];

    try {
      const info: nodemailer.SentMessageInfo = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send onboarding email: ${String(error)}`);
      throw new InternalServerErrorException('Failed to send onboarding email');
    }
  }

  async verifyConnection() {
    if (!this.hasMailConfig) {
      throw new ServiceUnavailableException('SMTP no configurado. Define MAIL_HOST, MAIL_USER y MAIL_PASSWORD.');
    }

    try {
      await this.transporter.verify();
    } catch (error) {
      this.logger.error(`SMTP verify failed: ${String(error)}`);
      throw new ServiceUnavailableException(
        'SMTP no disponible o credenciales inválidas. Revisa MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD y TLS.'
      );
    }
  }

  async sendStudyReminder({ email, html, subject }: { email: string; html: string; subject: string }) {
    if (!this.hasMailConfig) {
      throw new ServiceUnavailableException('SMTP no configurado. Define MAIL_HOST, MAIL_USER y MAIL_PASSWORD.');
    }
    return this.transporter.sendMail({
      attachments: [this.logoAttachment()],
      bcc: (process.env.MAIL_AUDIT_BCC ?? process.env.MAIL_USER ?? '').trim() || undefined,
      from: process.env.MAIL_FROM ?? '"Alta Medical Services" <info@altamedicalservices.com>',
      to: email,
      html,
      subject
    });
  }

  private renderTemplate(data: WelcomeEmailData) {
    return renderWelcomeEmail(readMailTemplate(), data);
  }

  private logoAttachment(): nodemailer.Attachment {
    const logoPath = this.resolveLogoPath();
    if (!logoPath) {
      this.logger.error('Alta Medical Services logo is missing');
      throw new InternalServerErrorException('Alta Medical Services logo is missing');
    }
    return {
      cid: 'logo-alta',
      contentDisposition: 'inline',
      contentType: 'image/png',
      filename: 'alta-medical-services-logo.png',
      path: logoPath
    };
  }

  private resolveLogoPath() {
    const candidates = [
      path.resolve(process.cwd(), 'public/alta-medical-services-logo.png'),
      path.resolve(process.cwd(), 'apps/api/public/alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../public/alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../../alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../alta-medical-services-logo.png'),
      path.resolve(process.cwd(), 'alta-medical-services-logo.png')
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
  }
}
