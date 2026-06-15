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

type ListedMailbox = {
  path?: string;
  name?: string;
  listed?: boolean;
  specialUse?: string;
};

function rankMailboxPath(path: string): number {
  const p = path.toLowerCase();
  let score = 0;
  if (p === 'enviados' || p.endsWith('/enviados') || p.endsWith('.enviados')) score += 100;
  if (p === 'sent' || p.endsWith('/sent') || p.endsWith('.sent')) score += 90;
  if (p.includes('enviad')) score += 80;
  if (p.includes('sent')) score += 70;
  if (p.includes('mail sent') || p.includes('sent items')) score += 60;
  if (p.includes('trash') || p.includes('papelera') || p.includes('spam') || p.includes('draft')) score -= 100;
  return score;
}

async function resolveSentMailbox(client: ImapFlow, preferred?: string): Promise<string> {
  if (preferred) return preferred;

  const listed: ListedMailbox[] = [];
  // list() és async iterable a imapflow.
  for await (const box of client.list()) {
    listed.push(box as ListedMailbox);
  }

  const sentBySpecialUse = listed.find((b) => (b.specialUse || '').toLowerCase() === '\\sent' && b.path);
  if (sentBySpecialUse?.path) return sentBySpecialUse.path;

  const scored = listed
    .map((b) => ({ path: b.path || b.name || '', score: rankMailboxPath(b.path || b.name || '') }))
    .filter((x) => x.path && x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored[0].path;

  // Fallback final.
  return 'Enviados';
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
  const mailbox = process.env.MAIL_IMAP_SENT_MAILBOX;

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

    const resolvedMailbox = await resolveSentMailbox(client, mailbox);
    await client.append(resolvedMailbox, rawMessage, ['\\Seen']);
    return { appended: true, mailbox: resolvedMailbox };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
