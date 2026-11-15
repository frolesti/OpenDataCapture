import fs from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingMailService } from '../onboarding-mail.service';

const mail = vi.hoisted(() => ({ sendMail: vi.fn(), verify: vi.fn() }));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => mail }
}));

beforeEach(() => {
  vi.stubEnv('MAIL_HOST', 'smtp.example.test');
  vi.stubEnv('MAIL_USER', 'support@example.test');
  vi.stubEnv('MAIL_PASSWORD', 'example-not-a-real-password');
  mail.sendMail.mockResolvedValue({ messageId: 'example' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const recipient = {
  email: 'investigator@example.test',
  firstName: 'María',
  lastName: 'García Pérez',
  password: 'EXAMPLE-ONLY',
  professionalTitle: 'Dra',
  username: 'mgarcia'
};

describe('OnboardingMailService', () => {
  it('uses the existing SMTP sender for study reminders and propagates delivery failures', async () => {
    const service = new OnboardingMailService();
    await service.sendStudyReminder({ email: recipient.email, html: '<p>THERA reminder</p>', subject: 'THERA' });
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipient.email,
        html: '<p>THERA reminder</p>',
        subject: 'THERA',
        attachments: [
          expect.objectContaining({
            cid: 'logo-alta',
            filename: 'alta-medical-services-logo.png'
          })
        ]
      })
    );
    mail.sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(
      service.sendStudyReminder({ email: recipient.email, html: '<p>THERA</p>', subject: 'THERA' })
    ).rejects.toThrow('SMTP unavailable');
  });
  it('sends the formal template with the full name and explicit title', async () => {
    await new OnboardingMailService().sendWelcomeEmail(recipient);
    expect(mail.sendMail).toHaveBeenCalledOnce();
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipient.email,
        subject: 'Credenciales de acceso a Alta Medical Services',
        html: expect.stringContaining('Estimada Dra. María García Pérez:'),
        attachments: [
          expect.objectContaining({ cid: 'logo-alta', contentDisposition: 'inline', contentType: 'image/png' })
        ]
      })
    );
  });

  it('does not retry a welcome email with a broken logo after an SMTP failure', async () => {
    mail.sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(new OnboardingMailService().sendWelcomeEmail(recipient)).rejects.toThrow(
      'Failed to send onboarding email'
    );
    expect(mail.sendMail).toHaveBeenCalledOnce();
    expect(mail.sendMail.mock.calls[0]?.[0].attachments[0].cid).toBe('logo-alta');
  });

  it.each(['welcome', 'reminder'])('fails explicitly when the %s email logo is missing', async (kind) => {
    const existsSync = fs.existsSync;
    vi.spyOn(fs, 'existsSync').mockImplementation((file) => !String(file).endsWith('.png') && existsSync(file));
    const service = new OnboardingMailService();
    await expect(
      kind === 'welcome'
        ? service.sendWelcomeEmail(recipient)
        : service.sendStudyReminder({ email: recipient.email, html: '<img src="cid:logo-alta">', subject: 'THERA' })
    ).rejects.toThrow('logo is missing');
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('never sends an email if the title has not been confirmed', async () => {
    await expect(
      new OnboardingMailService().sendWelcomeEmail({ ...recipient, professionalTitle: null })
    ).rejects.toThrow('Dr. o Dra.');
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it('fails explicitly instead of sending an informal fallback if the template is missing', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    await expect(new OnboardingMailService().sendWelcomeEmail(recipient)).rejects.toThrow('template is missing');
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});
