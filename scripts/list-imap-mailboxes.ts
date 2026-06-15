import 'dotenv/config';
import { ImapFlow } from 'imapflow';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on';
}

(async () => {
  const host = process.env.MAIL_IMAP_HOST;
  const port = Number(process.env.MAIL_IMAP_PORT || 993);
  const secure = process.env.MAIL_IMAP_SECURE ? isTruthy(process.env.MAIL_IMAP_SECURE) : true;
  const user = process.env.MAIL_IMAP_USER || process.env.MAIL_USER;
  const pass = process.env.MAIL_IMAP_PASSWORD || process.env.MAIL_PASSWORD;

  if (!host || !user || !pass) {
    console.error(
      'Missing IMAP config. Required: MAIL_IMAP_HOST, MAIL_IMAP_USER/MAIL_USER, MAIL_IMAP_PASSWORD/MAIL_PASSWORD'
    );
    process.exit(1);
  }

  const tlsServerName = process.env.MAIL_IMAP_TLS_SERVERNAME || host;
  const rejectUnauthorized = process.env.MAIL_IMAP_TLS_REJECT_UNAUTHORIZED
    ? process.env.MAIL_IMAP_TLS_REJECT_UNAUTHORIZED !== 'false'
    : true;

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
    console.log(`Connected to IMAP ${host}:${port} as ${user}`);
    console.log('Mailbox list:');
    for await (const box of client.list()) {
      const path = (box as { path?: string; name?: string }).path || (box as { name?: string }).name || '';
      const specialUse = ((box as { specialUse?: string }).specialUse || '').toString();
      console.log(`- ${path}${specialUse ? ` | specialUse=${specialUse}` : ''}`);
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
})();
