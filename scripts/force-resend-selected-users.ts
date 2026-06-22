import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import path from 'path';
import removeAccents from 'remove-accents';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5500').replace(/\/$/, '');
const API_CANDIDATES = Array.from(new Set([`${API_BASE}/v1`, `${API_BASE}/api/v1`]));
let API_URL = API_CANDIDATES[0];

const ADMIN_USERNAME = process.env.SCRIPT_ADMIN_USERNAME || 'frolesti';
const ADMIN_PASSWORD = process.env.SCRIPT_ADMIN_PASSWORD || 'FRoy116699';
const MAIL_AUDIT_LOG_PATH = process.env.MAIL_AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'mail-audit.csv');
const MAIL_ARCHIVE_BCC = (process.env.MAIL_AUDIT_BCC || process.env.MAIL_USER || '').trim() || undefined;
const DRY_RUN = process.env.DRY_RUN === 'true';

const spreadsheetId = '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = 'Hoja 1';
const range = `${sheetName}!A2:M`;

type TargetDoctor = {
  Nom: string;
  Cognoms: string;
  Email: string;
  Hospital: string;
};

const TARGET_DOCTORS: TargetDoctor[] = [
  {
    Nom: 'Maria Milagros',
    Cognoms: 'Gonzalez Bejar',
    Email: 'MGBEJAR@telefonica.net',
    Hospital: 'C. S. ARAVACA (Madrid)'
  },
  {
    Nom: 'Luis Maria',
    Cognoms: 'Fernandez-Pacheco Corchado',
    Email: 'luisfernandezpacheco@gmail.com',
    Hospital: 'C.S. Ensanche de Vallecas (Madrid)'
  },
  {
    Nom: 'Yolanda',
    Cognoms: 'Martin Blazquez',
    Email: 'ymarblac@gmail.com',
    Hospital: 'C. S. ENSANCHE DE VALLECAS'
  },
  {
    Nom: 'Maria Carmen',
    Cognoms: 'Valdes y Llorca',
    Email: 'cvaldesyllorca@gmail.com',
    Hospital: 'CS Fuencarral'
  },
  {
    Nom: 'Maria Juncal',
    Cognoms: 'Martinez Urazusta',
    Email: 'jmarme@hotmail.com',
    Hospital: 'CS Brujula'
  },
  {
    Nom: 'Gema',
    Cognoms: 'Fernandez Tabernero',
    Email: 'gema.fernandez.tabernero@gmail.com',
    Hospital: 'C. S. V CENTENARIO (Madrid)'
  },
  {
    Nom: 'Jose Miguel',
    Cognoms: 'Artica Garcia',
    Email: 'josemiart92@gmail.com',
    Hospital: 'CS Sector III, Getafe (Madrid)'
  }
];

interface DoctorRow {
  Nom: string;
  Cognoms: string;
  Email: string;
  Hospital: string;
  Password: string;
  MailSentAt: string;
  BasePermissionLevel: string;
  GroupIds: string;
  Sex: string;
  DateOfBirth: string;
  Updates: string;
  Signat: string;
  Tipus: string;
  rowIndex: number;
}

const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

function isSigned(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    v === 'true' ||
    v === 'verdadero' ||
    v === 'cert' ||
    v === 'si' ||
    v === 'sí' ||
    v === 'yes' ||
    v === '1' ||
    v === 'x'
  );
}

function isTestUser(value: string): boolean {
  if (!value) return false;
  return value.trim().toLowerCase().startsWith('usuari de test');
}

function cleanString(str: string) {
  return removeAccents(str).replace(/[^a-zA-Z0-9]/g, '');
}

function normalizeEmail(email: string) {
  return (email || '').trim().toLowerCase();
}

function buildUsername(nom: string, cognoms: string) {
  const initial = cleanString((nom || '').charAt(0).toLowerCase());
  const surname = cleanString((cognoms || '').split(' ')[0].toLowerCase());
  return `${initial}${surname}`;
}

function generatePassword(length = 14) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function getDoctors(): Promise<DoctorRow[]> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (
    res.data.values?.map((row, idx) => ({
      Nom: row[0] || '',
      Cognoms: row[1] || '',
      Email: row[2] || '',
      Hospital: row[3] || '',
      Password: row[4] || '',
      MailSentAt: row[5] || '',
      BasePermissionLevel: row[6] || 'STANDARD',
      GroupIds: row[7] || '',
      Sex: row[8] || '',
      DateOfBirth: row[9] && !row[9].startsWith('Error') ? row[9] : '1990-01-01',
      Updates: row[10] || '',
      Signat: row[11] || '',
      Tipus: row[12] || '',
      rowIndex: idx + 2
    })) || []
  );
}

async function login() {
  let lastError: unknown;
  for (const candidate of API_CANDIDATES) {
    try {
      const res = await axios.post(`${candidate}/auth/login`, {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      });
      API_URL = candidate;
      console.log(`Resolved API URL: ${API_URL}`);
      return res.data.accessToken;
    } catch (err) {
      lastError = err;
      if (axios.isAxiosError(err)) {
        console.warn(
          `Login failed against ${candidate}: ${err.response?.status || 'NO_STATUS'} ${err.response?.statusText || err.message}`
        );
      } else {
        console.warn(`Login failed against ${candidate}: ${String(err)}`);
      }
    }
  }
  throw lastError;
}

async function getAllUsers(token: string): Promise<Array<{ id: string; username: string }>> {
  const res = await axios.get(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function setPassword(userId: string, newPassword: string, token: string) {
  await axios.patch(
    `${API_URL}/users/${userId}`,
    { password: newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

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
      tls: { servername: tlsServerName, rejectUnauthorized },
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

function generateMailHtml(doctor: DoctorRow, user: { username: string; password: string }) {
  const templatePath = path.join(process.cwd(), 'scripts', 'mail-template.html');
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
  htmlTemplate = htmlTemplate
    .replace('{{Nom}}', doctor.Nom)
    .replace('{{username}}', user.username)
    .replace('{{password}}', user.password);
  return htmlTemplate;
}

function csvEscape(value: string): string {
  const v = value ?? '';
  return `"${v.replace(/"/g, '""')}"`;
}

function appendMailAudit(entry: {
  script: string;
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
        entry.script,
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
    console.warn("No s'ha pogut escriure el log d'auditoria de correu:", err);
  }
}

async function sendMail(doctor: DoctorRow, user: { username: string; password: string }, mailHtml: string) {
  const transporter = buildTransporter();
  const fromAddress =
    process.env.MAIL_FROM || `"Alta Medical Services" <${process.env.MAIL_USER || 'noreply@altamedicalservices.com'}>`;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: doctor.Email,
    bcc: MAIL_ARCHIVE_BCC,
    subject: 'Tu acceso a Alta Medical Services',
    html: mailHtml,
    attachments: [
      {
        filename: 'alta-medical-services-logo.png',
        path: join(__dirname, '../alta-medical-services-logo.png'),
        cid: 'logo-alta'
      }
    ]
  });

  console.log(
    `   SMTP to=${doctor.Email} messageId=${info.messageId} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)}`
  );

  appendMailAudit({
    script: 'force-resend-selected-users.ts',
    status: 'SENT',
    to: doctor.Email,
    username: user.username,
    messageId: info.messageId || '',
    accepted: (info.accepted || []).map(String).join(';'),
    rejected: (info.rejected || []).map(String).join(';'),
    error: ''
  });
}

async function updateSheetIdentity(rowIndex: number, doctor: TargetDoctor) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}:D${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[doctor.Nom, doctor.Cognoms, doctor.Email, doctor.Hospital]] }
  });
}

async function updateSheetCredentials(rowIndex: number, password: string, mailSentAt: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!E${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[password, mailSentAt]] }
  });
}

async function updateSheetUpdates(rowIndex: number, msg: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!K${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[msg]] }
  });
}

(async () => {
  try {
    console.log('--- force-resend-selected-users.ts ---');
    console.log(`DRY_RUN=${DRY_RUN}`);
    console.log(`Targets=${TARGET_DOCTORS.length}`);
    console.log(`MAIL_HOST=${process.env.MAIL_HOST || '(gmail fallback)'}`);
    console.log(`MAIL_PORT=${process.env.MAIL_PORT || '(default)'}`);

    if (!DRY_RUN) {
      const probe = buildTransporter();
      await probe.verify();
      console.log('SMTP preflight OK');
    } else {
      console.log('SMTP preflight skipped due to DRY_RUN=true');
    }

    const token = await login();
    const users = await getAllUsers(token);
    const usersByUsername = new Map<string, string>();
    for (const u of users) usersByUsername.set(u.username, u.id);

    const doctors = await getDoctors();
    const rowsByEmail = new Map<string, DoctorRow>();
    for (const row of doctors) rowsByEmail.set(normalizeEmail(row.Email), row);

    let ok = 0;
    let ko = 0;

    for (const target of TARGET_DOCTORS) {
      const emailKey = normalizeEmail(target.Email);
      const row = rowsByEmail.get(emailKey);

      if (!row) {
        console.error(`KO ${target.Email}: no existeix al Google Sheet.`);
        ko++;
        continue;
      }
      if (isTestUser(row.Tipus)) {
        console.error(`KO ${target.Email}: marcat com a usuari de test.`);
        ko++;
        continue;
      }
      if (!isSigned(row.Signat)) {
        console.error(`KO ${target.Email}: no signat.`);
        ko++;
        continue;
      }

      const usernameCandidates = [buildUsername(row.Nom, row.Cognoms), buildUsername(target.Nom, target.Cognoms)];
      const username = usernameCandidates.find((u) => usersByUsername.has(u));
      if (!username) {
        console.error(`KO ${target.Email}: no trobo usuari API per usernames [${usernameCandidates.join(', ')}].`);
        ko++;
        continue;
      }

      const userId = usersByUsername.get(username);
      if (!userId) {
        console.error(`KO ${target.Email}: userId buit per username=${username}`);
        ko++;
        continue;
      }

      try {
        const mergedDoctor: DoctorRow = {
          ...row,
          Nom: target.Nom,
          Cognoms: target.Cognoms,
          Email: target.Email,
          Hospital: target.Hospital
        };

        const newPassword = generatePassword();
        const now = new Date().toISOString();
        const updateMsg = `Force reset+resend OK (${now})`;

        if (DRY_RUN) {
          console.log(
            `[DRY] ${target.Email}: username=${username} -> faria reset, reenviament i update sheet A-D/E-F/K.`
          );
          ok++;
          continue;
        }

        await updateSheetIdentity(row.rowIndex, target);
        await setPassword(userId, newPassword, token);

        const mailHtml = generateMailHtml(mergedDoctor, { username, password: newPassword });
        await sendMail(mergedDoctor, { username, password: newPassword }, mailHtml);

        await updateSheetCredentials(row.rowIndex, newPassword, now);
        await updateSheetUpdates(row.rowIndex, updateMsg);
        fs.writeFileSync(`mail_${username}.html`, mailHtml);

        console.log(`OK ${target.Email}: reenviat amb username=${username}`);
        ok++;
      } catch (err) {
        const errMsg = String(err);
        console.error(`KO ${target.Email}: ${errMsg}`);
        await updateSheetUpdates(
          row.rowIndex,
          `Force reset+resend KO (${new Date().toISOString()}) - ${errMsg.slice(0, 180)}`
        );
        appendMailAudit({
          script: 'force-resend-selected-users.ts',
          status: 'FAILED',
          to: target.Email,
          username,
          messageId: '',
          accepted: '',
          rejected: '',
          error: errMsg
        });
        ko++;
      }
    }

    console.log(`Resum final: OK=${ok} | KO=${ko} | total=${TARGET_DOCTORS.length}`);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
})();
