import { CryptoService, InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import path from 'path';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel('User') private readonly userModel: Model<'User'>,
    private readonly cryptoService: CryptoService
  ) {
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
    // Try to find user by username or email
    const user = await this.userModel.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }]
      }
    });

    if (!user) {
      this.logger.warn(`Password reset requested for non-existent user: ${identifier}`);
      // Return success to avoid enumeration
      return { success: true };
    }

    // Determine email to send to
    let emailToSendTo = user.email;

    // Fallback: if no email in DB, check if username looks like an email
    if (!emailToSendTo && user.username.includes('@')) {
      emailToSendTo = user.username;
    }

    if (!emailToSendTo) {
      this.logger.warn(`Password reset requested for user ${user.username} but no email found.`);
      // Fallback: notify support
      const contactEmail = process.env.CONTACT_EMAIL || 'suport.alta.medical@gmail.com';
      await this.transporter.sendMail({
        from: '"Alta Medical Services" <noreply@altamedicalservices.com>',
        to: contactEmail,
        subject: `Password Reset Request (No Email Found): ${user.username}`,
        text: `The user '${user.username}' requested a password reset, but has no email address on file. Please contact them manually.`
      });
      return { success: true };
    }

    // Generate new password
    const newPassword = this.generatePassword();
    const hashedPassword = await this.cryptoService.hashPassword(newPassword);

    // Update user
    await this.userModel.update({
      where: { id: user.id },
      data: { hashedPassword }
    });

    // Send email to user
    const mailOptions = {
      from: '"Alta Medical Services" <noreply@altamedicalservices.com>',
      to: emailToSendTo,
      subject: 'Restablecimiento de Contraseña - Alta Medical Services',
      html: `
        <!doctype html>
        <html lang="es">
        <head>
            <meta charset="UTF-8" />
            <title>Restablecimiento de Contraseña - Alta Medical Services</title>
            <style>
            body {
                background: #f6f8fb;
                font-family: 'Segoe UI', Arial, sans-serif;
                margin: 0;
                padding: 0;
            }
            .card {
                max-width: 520px;
                width: 100%;
                margin: 48px auto;
                background: #fff;
                border-radius: 16px;
                box-shadow:
                0 6px 32px rgba(100, 100, 150, 0.18),
                0 1.5px 6px rgba(100, 100, 150, 0.1);
                padding: 32px 24px;
                text-align: center;
                border: 1px solid #ececec;
            }
            .greeting {
                font-size: 1.1rem;
                margin-bottom: 16px;
                color: #222;
            }
            .info {
                background: #f6f8fb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 24px;
                font-size: 1rem;
                color: #333;
                text-align: left;
            }
            .cta {
                display: block;
                width: 100%;
                background: #a7a6f9;
                color: #fff !important;
                border: none;
                border-radius: 8px;
                padding: 12px 0;
                font-size: 1.1rem;
                font-weight: bold;
                text-decoration: none;
                margin-bottom: 16px;
                margin-top: 8px;
                transition: background 0.2s;
            }
            .cta:hover {
                background: #8d8be6;
                color: #fff !important;
            }
            .footer {
                font-size: 0.95rem;
                color: #888;
                margin-top: 24px;
                text-align: center;
            }
            .signature {
                font-size: 0.95rem;
                color: #888;
            }
            @media (max-width: 600px) {
                .card {
                padding: 16px 4px;
                margin: 16px auto;
                }
            }
            </style>
        </head>
        <body>
            <div class="card">
            <div
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 16px"
            >
                <img
                src="cid:logo-alta"
                alt="ALTA medical services"
                style="display: block; margin: 0 auto; max-width: 160px; height: auto"
                />
            </div>
            <div class="greeting">Hola ${user.firstName},</div>
            <div class="info">
                Hemos recibido una solicitud para restablecer tu contraseña de <strong>Alta Medical Services</strong>.<br /><br />
                <strong>Nueva Contraseña:</strong> ${newPassword}<br />
            </div>
            <a class="cta" href="https://altahealthdata.com/auth/login">Acceder a la plataforma</a>
            <div class="footer">Por favor, inicia sesión y cambia tu contraseña inmediatamente.<br /></div>
            <div class="signature">
                Saludos,<br />
                El equipo de Alta Medical Services
            </div>
            </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'alta-medical-services-logo.png',
          path: path.resolve(process.cwd(), '../../alta-medical-services-logo.png'),
          cid: 'logo-alta'
        }
      ]
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${emailToSendTo} for user ${user.username}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      // Try sending without attachment if it fails (e.g. file not found)
      try {
        delete (mailOptions as any).attachments;
        // Remove image tag from html if attachment fails? Or just let it be broken image.
        // Better to try sending without attachment.
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Password reset email sent (without logo) to ${emailToSendTo} for user ${user.username}`);
        return { success: true };
      } catch (retryError) {
        this.logger.error(`Failed to send email (retry): ${retryError}`);
        throw retryError;
      }
    }
  }

  private generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}
