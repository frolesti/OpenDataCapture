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
  it('sends the formal template with the full name and explicit title', async () => {
    await new OnboardingMailService().sendWelcomeEmail(recipient);
    expect(mail.sendMail).toHaveBeenCalledOnce();
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipient.email,
        subject: 'Credenciales de acceso a Alta Medical Services',
        html: expect.stringContaining('Estimada Dra. María García Pérez:')
      })
    );
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
