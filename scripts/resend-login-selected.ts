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

const spreadsheetId = process.env.SHEET_ID || '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = process.env.SHEET_NAME || 'Hoja 1';
const range = `${sheetName}!A2:M`;

const TARGET_USERS_FILE =
  process.env.TARGET_USERS_FILE || path.join(process.cwd(), 'scripts', 'targets-madrid-resend.json');
const TARGET_EMAILS = process.env.TARGET_EMAILS || '';
const DRY_RUN = parseBool(process.env.DRY_RUN, false);
const UPDATE_SHEET_PROFILE = parseBool(process.env.UPDATE_SHEET_PROFILE, true);
const SYNC_NAMES_TO_API = parseBool(process.env.SYNC_NAMES_TO_API, false);
const ALLOW_CREATE_MISSING = parseBool(process.env.ALLOW_CREATE_MISSING, false);
const REQUIRE_SIGNED = parseBool(process.env.REQUIRE_SIGNED, true);
const REQUIRE_SMTP_CONFIG = parseBool(process.env.REQUIRE_SMTP_CONFIG, true);

console.log(`Using API URL candidates: ${API_CANDIDATES.join(' | ')}`);
console.log(`Using Admin Username: ${ADMIN_USERNAME}`);
console.log(`Using Admin Password Length: ${ADMIN_PASSWORD.length}`);
console.log(
  `DRY_RUN=${DRY_RUN} | UPDATE_SHEET_PROFILE=${UPDATE_SHEET_PROFILE} | SYNC_NAMES_TO_API=${SYNC_NAMES_TO_API}`
);

const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

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

interface TargetUser {
  email: string;
  nom?: string;
  cognoms?: string;
  hospital?: string;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'si'].includes(value.trim().toLowerCase());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanString(str: string) {
  return removeAccents(str).replace(/[^a-zA-Z0-9]/g, '');
}

function buildUsername(nom: string, cognoms: string) {
  const initial = cleanString(nom.charAt(0).toLowerCase());
  const surname = cleanString(cognoms.split(' ')[0].toLowerCase());
  return `${initial}${surname}`;
}

function isSigned(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return (
    v === 'true' ||
    v === 'verdadero' ||
    v === 'cert' ||
    v === 'sí' ||
    v === 'si' ||
    v === 'yes' ||
    v === '1' ||
    v === 'x'
  );
}

function isTestUser(value: string): boolean {
  if (!value) return false;
  return value.trim().toLowerCase().startsWith('usuari de test');
}

function parseSex(sex: string): 'MALE' | 'FEMALE' | undefined {
  if (!sex) return undefined;
  const s = sex.trim().toUpperCase();
  if (['M', 'MALE', 'HOME', 'HOMBRE', 'H'].includes(s)) return 'MALE';
  if (['F', 'FEMALE', 'DONA', 'MUJER', 'D'].includes(s)) return 'FEMALE';
  return undefined;
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return undefined;
}

function generatePassword(length = 14) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

async function updateSheetProfile(rowIndex: number, nom: string, cognoms: string, email: string, hospital: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}:D${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[nom, cognoms, email, hospital]] }
  });
}

async function updateSheetPassword(rowIndex: number, password: string, mailSentAt: string) {
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
  console.error('Error logging in:', lastError);
  throw lastError;
}

async function getAllUsers(token: string): Promise<Array<{ id: string; username: string }>> {
  const res = await axios.get(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function getGroups(token: string) {
  try {
    const res = await axios.get(`${API_URL}/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err) {
    console.error('Error fetching groups:', err);
    return [];
  }
}

async function createUserInApp(doctor: DoctorRow, token: string, groupsMap: Map<string, string>) {
  const username = buildUsername(doctor.Nom, doctor.Cognoms);
  const password = generatePassword();

  const groupIds = doctor.GroupIds
    ? doctor.GroupIds.split(',')
        .map((g) => {
          const id = groupsMap.get(g.trim());
          if (!id) console.warn(`Group not found for user ${username}: ${g.trim()}`);
          return id;
        })
        .filter((id): id is string => Boolean(id))
    : [];

  const userData: Record<string, unknown> = {
    username,
    password,
    basePermissionLevel: doctor.BasePermissionLevel || 'STANDARD',
    groupIds,
    firstName: doctor.Nom,
    lastName: doctor.Cognoms
  };

  const parsedSex = parseSex(doctor.Sex);
  if (parsedSex) userData.sex = parsedSex;

  const parsedDate = parseDate(doctor.DateOfBirth);
  if (parsedDate) userData.dateOfBirth = parsedDate;

  const res = await axios.post(`${API_URL}/users`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return { id: res.data.id as string, username, password };
}

async function patchUser(userId: string, payload: Record<string, unknown>, token: string) {
  await axios.patch(`${API_URL}/users/${userId}`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
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
    `   ✉  SMTP host=${process.env.MAIL_HOST || 'gmail-service'} | from=${fromAddress} | to=${doctor.Email} | messageId=${info.messageId}` +
      (info.accepted?.length ? ` | accepted=[${info.accepted.join(', ')}]` : '') +
      (info.rejected?.length ? ` | rejected=[${info.rejected.join(', ')}]` : '')
  );

  appendMailAudit({
    script: 'resend-login-selected.ts',
    status: 'SENT',
    to: doctor.Email,
    username: user.username,
    messageId: info.messageId || '',
    accepted: (info.accepted || []).map(String).join(';'),
    rejected: (info.rejected || []).map(String).join(';'),
    error: ''
  });
}

function loadTargets(): TargetUser[] {
  if (TARGET_USERS_FILE) {
    const raw = fs.readFileSync(TARGET_USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as TargetUser[];
    return parsed.map((t) => ({
      email: normalizeEmail(t.email),
      nom: t.nom?.trim(),
      cognoms: t.cognoms?.trim(),
      hospital: t.hospital?.trim()
    }));
  }

  if (TARGET_EMAILS.trim()) {
    return TARGET_EMAILS.split(',')
      .map((e) => normalizeEmail(e))
      .filter(Boolean)
      .map((email) => ({ email }));
  }

  throw new Error('No targets provided. Set TARGET_USERS_FILE or TARGET_EMAILS.');
}

(async () => {
  try {
    console.log('--- Mail config ---');
    console.log(`  MAIL_HOST     : ${process.env.MAIL_HOST || '(no definit — caurà a Gmail)'}`);
    console.log(`  MAIL_PORT     : ${process.env.MAIL_PORT || '(per defecte 465)'}`);
    console.log(`  MAIL_SECURE   : ${process.env.MAIL_SECURE || '(per defecte derivat del port)'}`);
    console.log(`  MAIL_USER     : ${process.env.MAIL_USER || '(no definit)'}`);
    console.log(`  MAIL_FROM     : ${process.env.MAIL_FROM || '(no definit — usa MAIL_USER)'}`);
    console.log(`  MAIL_AUDIT_LOG_PATH : ${MAIL_AUDIT_LOG_PATH}`);
    console.log(`  MAIL_ARCHIVE_BCC : ${MAIL_ARCHIVE_BCC || '(no definit)'}`);
    console.log(`  REQUIRE_SMTP_CONFIG : ${REQUIRE_SMTP_CONFIG}`);
    console.log(
      `  MAIL_PASSWORD : ${process.env.MAIL_PASSWORD ? '(set, len=' + process.env.MAIL_PASSWORD.length + ')' : "(NO DEFINIT — fallarà l'enviament)"}`
    );
    console.log('-------------------');

    const targets = loadTargets();
    const targetMap = new Map<string, TargetUser>();
    for (const t of targets) targetMap.set(normalizeEmail(t.email), t);

    console.log(`Targets carregats: ${targetMap.size}`);

    if (!DRY_RUN) {
      if (REQUIRE_SMTP_CONFIG && !process.env.MAIL_HOST) {
        console.error('✗ MAIL_HOST no definit i REQUIRE_SMTP_CONFIG=true.');
        console.error('  Per seguretat, aquest script no enviarà via fallback Gmail en producció.');
        process.exit(1);
      }

      try {
        const probe = buildTransporter();
        await probe.verify();
        console.log('SMTP preflight OK — podem enviar correus.');
      } catch (err) {
        console.error('✗ SMTP preflight KO — no s’executa res. Revisa MAIL_* al .env.');
        console.error(err);
        process.exit(1);
      }
    } else {
      console.log('DRY_RUN=true, no es valida SMTP ni es fan canvis.');
    }

    const token = await login();
    const doctors = await getDoctors();

    const doctorsByEmail = new Map<string, DoctorRow>();
    for (const d of doctors) doctorsByEmail.set(normalizeEmail(d.Email), d);

    let usersByUsername = new Map<string, string>();
    let groupsMap = new Map<string, string>();

    if (!DRY_RUN) {
      const allUsers = await getAllUsers(token);
      usersByUsername = new Map(allUsers.map((u) => [u.username, u.id]));

      if (ALLOW_CREATE_MISSING) {
        const groups = await getGroups(token);
        groupsMap = new Map(groups.map((g: { id: string; name: string }) => [g.name, g.id]));
      }
    }

    let okCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const [email, target] of targetMap.entries()) {
      const row = doctorsByEmail.get(email);
      if (!row) {
        console.warn(`⚠️  No trobat al sheet: ${email}`);
        failCount++;
        continue;
      }

      if (isTestUser(row.Tipus)) {
        console.warn(`⚠️  Saltat usuari de test: ${email}`);
        skippedCount++;
        continue;
      }

      if (REQUIRE_SIGNED && !isSigned(row.Signat)) {
        console.warn(`⚠️  Saltat no signat: ${email}`);
        skippedCount++;
        continue;
      }

      const updatedRow: DoctorRow = {
        ...row,
        Nom: target.nom || row.Nom,
        Cognoms: target.cognoms || row.Cognoms,
        Hospital: target.hospital || row.Hospital,
        Email: email
      };

      const oldUsername = buildUsername(row.Nom, row.Cognoms);
      const username = buildUsername(updatedRow.Nom, updatedRow.Cognoms);
      const now = new Date().toISOString();

      try {
        if (!DRY_RUN && UPDATE_SHEET_PROFILE) {
          await updateSheetProfile(
            row.rowIndex,
            updatedRow.Nom,
            updatedRow.Cognoms,
            updatedRow.Email,
            updatedRow.Hospital
          );
        }

        if (DRY_RUN) {
          console.log(`[DRY_RUN] ${email} -> username=${username} (old=${oldUsername})`);
          okCount++;
          continue;
        }

        let userId = usersByUsername.get(username) || usersByUsername.get(oldUsername);
        if (!userId && ALLOW_CREATE_MISSING) {
          const created = await createUserInApp(updatedRow, token, groupsMap);
          userId = created.id;
          usersByUsername.set(created.username, created.id);
          console.log(`Creat usuari nou per ${email}: ${created.username}`);
        }

        if (!userId) {
          const msg = `Usuari no trobat a l'API (username intentats: ${username}, ${oldUsername})`;
          await updateSheetUpdates(row.rowIndex, `Resend KO (${now}) — ${msg}`);
          console.warn(`✗ ${email}: ${msg}`);
          failCount++;
          continue;
        }

        if (SYNC_NAMES_TO_API && (updatedRow.Nom !== row.Nom || updatedRow.Cognoms !== row.Cognoms)) {
          await patchUser(
            userId,
            {
              firstName: updatedRow.Nom,
              lastName: updatedRow.Cognoms
            },
            token
          );
        }

        const newPassword = generatePassword();
        await patchUser(userId, { password: newPassword }, token);

        const mailHtml = generateMailHtml(updatedRow, { username, password: newPassword });
        await sendMail(updatedRow, { username, password: newPassword }, mailHtml);

        await updateSheetPassword(row.rowIndex, newPassword, now);
        await updateSheetUpdates(row.rowIndex, `Target resend OK (${now})`);

        console.log(`✔ Reenviat: ${updatedRow.Nom} ${updatedRow.Cognoms} <${updatedRow.Email}>`);
        okCount++;
      } catch (err) {
        const message = String(err);
        console.error(`✗ Error amb ${email}:`, err);
        appendMailAudit({
          script: 'resend-login-selected.ts',
          status: 'FAILED',
          to: email,
          username,
          messageId: '',
          accepted: '',
          rejected: '',
          error: message
        });
        if (!DRY_RUN) {
          await updateSheetUpdates(row.rowIndex, `Target resend KO (${now}) — ${message.substring(0, 200)}`);
        }
        failCount++;
      }
    }

    console.log('\nResum final');
    console.log(`  OK      : ${okCount}`);
    console.log(`  KO      : ${failCount}`);
    console.log(`  Saltats : ${skippedCount}`);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
})();
