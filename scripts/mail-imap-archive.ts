import { randomUUID } from 'crypto';
import { ImapFlow } from 'imapflow';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on';
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return isTruthy(value);
}

function formatAddress(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}

function buildRawMessage(opts: {
  from: string;
  to: string;
  subject: string;
  text: string;
  messageId?: string;
}): Buffer {
  const messageId = opts.messageId || `<${randomUUID()}@local.imap-archive>`;
  const lines = [
    `From: ${formatAddress(opts.from)}`,
    `To: ${formatAddress(opts.to)}`,
    `Subject: ${opts.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    opts.text
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8');
}

export async function appendSentCopyIfConfigured(opts: {
  from: string;
  to: string;
  subject: string;
  messageId?: string;
  bodyText: string;
}): Promise<{ appended: boolean; reason?: string; mailbox?: string }> {
  const enabled = parseBoolean(process.env.MAIL_IMAP_APPEND_TO_SENT, false);
  if (!enabled) return { appended: false, reason: 'disabled' };

  const host = process.env.MAIL_IMAP_HOST;
  const port = Number(process.env.MAIL_IMAP_PORT || 993);
  const secure = parseBoolean(process.env.MAIL_IMAP_SECURE, true);
  const user = process.env.MAIL_IMAP_USER || process.env.MAIL_USER;
  const pass = process.env.MAIL_IMAP_PASSWORD || process.env.MAIL_PASSWORD;
  const mailbox = process.env.MAIL_IMAP_SENT_MAILBOX || 'Enviados';

  if (!host || !user || !pass) {
    return { appended: false, reason: 'missing MAIL_IMAP_* credentials/host' };
  }

  const tlsServerName = process.env.MAIL_IMAP_TLS_SERVERNAME || host;
  const rejectUnauthorized = parseBoolean(process.env.MAIL_IMAP_TLS_REJECT_UNAUTHORIZED, true);

  const rawMessage = buildRawMessage({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    messageId: opts.messageId,
    text: opts.bodyText
  });

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      servername: tlsServerName,
      rejectUnauthorized
    }
  });

  try {
    await client.connect();

    try {
      await client.mailboxCreate(mailbox);
    } catch {
      // Ignore if mailbox already exists or cannot be created due to ACL.
    }

    await client.append(mailbox, rawMessage, ['\\Seen']);
    return { appended: true, mailbox };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
