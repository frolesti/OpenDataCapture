import { CryptoService, getModelToken } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { MockFactory } from '@douglasneuroinformatics/libnest/testing';
import type { MockedInstance } from '@douglasneuroinformatics/libnest/testing';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $ForgotPasswordDto } from '../dto/forgot-password.dto';
import { SupportService } from '../support.service';

const mail = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({
  default: {
    createTransport: mail.createTransport
  }
}));

describe('password recovery delivery', () => {
  let service: SupportService;
  let users: MockedInstance<Model<'User'>>;

  beforeEach(async () => {
    vi.stubEnv('MAIL_HOST', 'smtp.example.test');
    vi.stubEnv('MAIL_TLS_SERVERNAME', 'relay.example.test');
    vi.stubEnv('MAIL_SECURE', 'false');
    mail.createTransport.mockReturnValue({ sendMail: mail.sendMail });
    mail.sendMail.mockResolvedValue({ messageId: 'test-message' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportService,
        MockFactory.createForModelToken(getModelToken('User')),
        MockFactory.createForService(CryptoService)
      ]
    }).compile();
    service = moduleRef.get(SupportService);
    users = moduleRef.get(getModelToken('User'));
    users.findFirst.mockResolvedValue({
      email: 'investigator@example.test',
      firstName: 'Maria',
      id: 'researcher',
      username: 'mfernandez'
    });
    moduleRef.get<MockedInstance<CryptoService>>(CryptoService).hashPassword.mockResolvedValue('new-password-hash');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('uses the configured certificate name and keeps TLS verification enabled', () => {
    expect(mail.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        requireTLS: true,
        tls: { rejectUnauthorized: true, servername: 'relay.example.test' }
      })
    );
  });

  it('normalizes pasted identifiers in both the request schema and account lookup', async () => {
    expect($ForgotPasswordDto.parse({ identifier: ' mfernandez ' }).identifier).toBe('mfernandez');
    expect($ForgotPasswordDto.safeParse({ identifier: ' ' }).success).toBe(false);
    await service.sendForgotPasswordEmail(' mfernandez ');
    expect(users.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ username: 'mfernandez' }, { email: 'mfernandez' }] }
    });
  });

  it('keeps the previous password if both delivery attempts fail', async () => {
    mail.sendMail.mockRejectedValue(new Error('SMTP certificate rejected'));
    await expect(service.sendForgotPasswordEmail('mfernandez')).rejects.toThrow('SMTP certificate rejected');
    expect(mail.sendMail).toHaveBeenCalledTimes(2);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('updates the password only after the email is accepted', async () => {
    mail.sendMail.mockImplementationOnce(() => {
      expect(users.update).not.toHaveBeenCalled();
      return Promise.resolve({ messageId: 'test-message' });
    });
    await expect(service.sendForgotPasswordEmail('mfernandez')).resolves.toEqual({ success: true });
    expect(users.update).toHaveBeenCalledWith({
      data: { hashedPassword: 'new-password-hash' },
      where: { id: 'researcher' }
    });
  });

  it('updates once if the attachment-free retry succeeds', async () => {
    mail.sendMail.mockRejectedValueOnce(new Error('Attachment not found')).mockResolvedValueOnce({});
    await service.sendForgotPasswordEmail('mfernandez');
    expect(mail.sendMail).toHaveBeenCalledTimes(2);
    expect(users.update).toHaveBeenCalledOnce();
  });

  it('does not send another message when the database update fails', async () => {
    users.update.mockRejectedValueOnce(new Error('Database write failed'));
    await expect(service.sendForgotPasswordEmail('mfernandez')).rejects.toThrow('Database write failed');
    expect(mail.sendMail).toHaveBeenCalledOnce();
  });
});
