import fs from 'node:fs';
import path from 'node:path';

import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

import { renderWelcomeEmail, type WelcomeEmailData } from './welcome-email';

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

    const logoPath = this.resolveLogoPath();
    if (logoPath) {
      mailOptions.attachments = [
        {
          cid: 'logo-alta',
          filename: 'alta-medical-services-logo.png',
          path: logoPath
        }
      ];
    }

    try {
      const info: nodemailer.SentMessageInfo = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      if (mailOptions.attachments) {
        delete mailOptions.attachments;
        try {
          const info: nodemailer.SentMessageInfo = await this.transporter.sendMail(mailOptions);
          return info;
        } catch (retryError) {
          this.logger.error(`Failed to send onboarding email after retry: ${String(retryError)}`);
          throw new InternalServerErrorException('Failed to send onboarding email');
        }
      }
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

  private renderTemplate(data: WelcomeEmailData) {
    const templatePath = this.resolveTemplatePath();
    if (!templatePath) {
      this.logger.error('Onboarding email template is missing');
      throw new InternalServerErrorException('Onboarding email template is missing');
    }

    return renderWelcomeEmail(fs.readFileSync(templatePath, 'utf8'), data);
  }

  private resolveLogoPath() {
    const candidates = [
      path.resolve(process.cwd(), 'public/alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../public/alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../../alta-medical-services-logo.png'),
      path.resolve(process.cwd(), '../alta-medical-services-logo.png'),
      path.resolve(process.cwd(), 'alta-medical-services-logo.png')
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  private resolveTemplatePath() {
    const candidates = [
      path.resolve(process.cwd(), 'public/mail-template.html'),
      path.resolve(process.cwd(), '../public/mail-template.html'),
      path.resolve(process.cwd(), 'apps/api/public/mail-template.html')
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
  }
}
