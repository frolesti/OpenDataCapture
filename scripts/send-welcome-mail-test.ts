import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAIL_AUDIT_LOG_PATH = process.env.MAIL_AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'mail-audit.csv');
const MAIL_AUDIT_BCC = process.env.MAIL_AUDIT_BCC;

const toEmail = process.env.TEST_TO_EMAIL || process.argv[2];
if (!toEmail) {
  console.error('Missing destination email. Use TEST_TO_EMAIL env var or pass as first arg.');
  console.error('Example: TEST_TO_EMAIL=frolesti_9@hotmail.com pnpm exec tsx scripts/send-welcome-mail-test.ts');
  process.exit(1);
}

const testName = process.env.TEST_WELCOME_NAME || 'Usuari de prova';
const testUsername = process.env.TEST_WELCOME_USERNAME || 'usuari.prova';
const testPassword = process.env.TEST_WELCOME_PASSWORD || 'Demo-Password-2026';

function buildTransporter() {
  if (process.env.MAIL_HOST) {
    const port = Number(process.env.MAIL_PORT) || 465;
    const secure = process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : port === 465;
    const tlsServerName = process.env.MAIL_TLS_SERVERNAME || process.env.MAIL_HOST;
    const rejectUnauthorized = process.env.MAIL_TLS_REJECT_UNAUTHORIZED
      ? process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
      : true;

    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure,
      requireTLS: !secure,
      tls: {
        servername: tlsServerName,
        rejectUnauthorized
      },
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });
}

function generateMailHtml(name: string, username: string, password: string) {
  const templatePath = path.join(process.cwd(), 'scripts', 'mail-template.html');
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
  htmlTemplate = htmlTemplate
    .replace('{{Nom}}', name)
    .replace('{{username}}', username)
    .replace('{{password}}', password);
  return htmlTemplate;
}

function csvEscape(value: string): string {
  const v = value ?? '';
  return `"${v.replace(/"/g, '""')}"`;
}

function appendMailAudit(entry: {
  status: 'SENT' | 'FAILED';
  to: string;
  username: string;
  messageId: string;
  accepted: string;
  rejected: string;
  error: string;
}) {
  try {
    const dir = path.dirname(MAIL_AUDIT_LOG_PATH);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(MAIL_AUDIT_LOG_PATH)) {
      const header = 'timestamp,script,status,to,username,messageId,accepted,rejected,error\n';
      fs.writeFileSync(MAIL_AUDIT_LOG_PATH, header, 'utf8');
    }

    const line =
      [
        new Date().toISOString(),
        'send-welcome-mail-test.ts',
        entry.status,
        entry.to,
        entry.username,
        entry.messageId,
        entry.accepted,
        entry.rejected,
        entry.error
      ]
        .map((v) => csvEscape(v))
        .join(',') + '\n';

    fs.appendFileSync(MAIL_AUDIT_LOG_PATH, line, 'utf8');
  } catch (err) {
    console.warn('Could not append mail audit log:', err);
  }
}

(async () => {
  const fromAddress =
    process.env.MAIL_FROM || `"Alta Medical Services" <${process.env.MAIL_USER || 'noreply@altamedicalservices.com'}>`;

  console.log('--- Mail test config ---');
  console.log(`  MAIL_HOST     : ${process.env.MAIL_HOST || '(fallback gmail service)'}`);
  console.log(`  MAIL_PORT     : ${process.env.MAIL_PORT || '(default 465)'}`);
  console.log(`  MAIL_SECURE   : ${process.env.MAIL_SECURE || '(derived from port)'}`);
  console.log(`  MAIL_USER     : ${process.env.MAIL_USER || '(undefined)'}`);
  console.log(`  MAIL_FROM     : ${fromAddress}`);
  console.log(`  MAIL_AUDIT_LOG_PATH : ${MAIL_AUDIT_LOG_PATH}`);
  console.log(`  MAIL_AUDIT_BCC : ${MAIL_AUDIT_BCC || '(undefined)'}`);
  console.log(`  TO            : ${toEmail}`);
  console.log('------------------------');

  const transporter = buildTransporter();

  try {
    await transporter.verify();
    console.log('SMTP preflight OK.');
  } catch (err) {
    console.error('SMTP preflight KO. Nothing sent.');
    console.error(err);
    process.exit(1);
  }

  const html = generateMailHtml(testName, testUsername, testPassword);

  fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'logs', 'welcome-mail-test-preview.html'), html, 'utf8');

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      bcc: MAIL_AUDIT_BCC,
      subject: 'Tu acceso a Alta Medical Services',
      html,
      attachments: [
        {
          filename: 'alta-medical-services-logo.png',
          path: join(__dirname, '../alta-medical-services-logo.png'),
          cid: 'logo-alta'
        }
      ]
    });

    console.log(
      `Mail sent | from=${fromAddress} | to=${toEmail} | messageId=${info.messageId} | accepted=${JSON.stringify(info.accepted)} | rejected=${JSON.stringify(info.rejected)}`
    );

    appendMailAudit({
      status: 'SENT',
      to: toEmail,
      username: testUsername,
      messageId: info.messageId || '',
      accepted: (info.accepted || []).map(String).join(';'),
      rejected: (info.rejected || []).map(String).join(';'),
      error: ''
    });

    console.log(`Audit row appended to ${MAIL_AUDIT_LOG_PATH}`);
    console.log('Done. Check both your mailbox and Sent folder in Acens webmail.');
  } catch (err) {
    console.error('Error sending test mail:', err);
    appendMailAudit({
      status: 'FAILED',
      to: toEmail,
      username: testUsername,
      messageId: '',
      accepted: '',
      rejected: '',
      error: String(err)
    });
    process.exit(1);
  }
})();
