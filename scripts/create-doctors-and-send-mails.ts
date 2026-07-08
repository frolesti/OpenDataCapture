import 'dotenv/config';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import removeAccents from 'remove-accents';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5500').replace(/\/$/, '');
const API_CANDIDATES = Array.from(new Set([`${API_BASE}/v1`, `${API_BASE}/api/v1`]));
let API_URL = API_CANDIDATES[0];
// Use specific env vars for this script (REQUIRED - no fallbacks)
const ADMIN_USERNAME = process.env.SCRIPT_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.SCRIPT_ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('ERROR: SCRIPT_ADMIN_USERNAME and SCRIPT_ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}
const MAIL_AUDIT_LOG_PATH = process.env.MAIL_AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'mail-audit.csv');
const MAIL_ARCHIVE_BCC = (process.env.MAIL_AUDIT_BCC || process.env.MAIL_USER || '').trim() || undefined;

console.log(`Using API URL candidates: ${API_CANDIDATES.join(' | ')}`);
console.log(`Using Admin Username: ${ADMIN_USERNAME}`);

// Configura Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = 'Hoja 1';
// Capçalera a la fila 1. Llegim fins a la columna M (Tipus).
const range = `${sheetName}!A2:M`;

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

// Considerem signat qualsevol valor que comenci per 't' (TRUE / true / True / 1 → opcional).
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

// Files amb Tipus = "Usuari de test" mai s'han de processar (afegit per seguretat).
function isTestUser(value: string): boolean {
  if (!value) return false;
  return value.trim().toLowerCase().startsWith('usuari de test');
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

function cleanString(str: string) {
  return removeAccents(str).replace(/[^a-zA-Z0-9]/g, '');
}

function buildUsername(nom: string, cognoms: string) {
  const initial = cleanString(nom.charAt(0).toLowerCase());
  const surname = cleanString(cognoms.split(' ')[0].toLowerCase());
  return `${initial}${surname}`;
}

function parseSex(sex: string): 'MALE' | 'FEMALE' | undefined {
  if (!sex) return undefined;
  const s = sex.trim().toUpperCase();
  // Accepta variants en anglès, català i castellà
  if (['M', 'MALE', 'HOME', 'HOMBRE', 'H'].includes(s)) return 'MALE';
  if (['F', 'FEMALE', 'DONA', 'MUJER', 'D'].includes(s)) return 'FEMALE';
  return undefined;
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Intenta format ISO (YYYY-MM-DD)
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  // Intenta format DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // Reordena a YYYY-MM-DD
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return undefined;
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

async function userExists(username: string, token: string) {
  try {
    const res = await axios.get(`${API_URL}/users/check-username/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.success === true;
  } catch {
    return false;
  }
}

async function createUserInApp(doctor: any, password: string, token: string, groupsMap: Map<string, string>) {
  const username = buildUsername(doctor.Nom, doctor.Cognoms);
  if (await userExists(username, token)) {
    return { exists: true, username };
  }

  const groupIds = doctor.GroupIds
    ? doctor.GroupIds.split(',')
        .map((g: string) => {
          const name = g.trim();
          const id = groupsMap.get(name);
          if (!id) console.warn(`Group not found for user ${username}: ${name}`);
          return id;
        })
        .filter((id: string | undefined) => id !== undefined)
    : [];

  const userData: any = {
    username,
    password,
    basePermissionLevel: doctor.BasePermissionLevel || 'STANDARD',
    groupIds,
    firstName: doctor.Nom,
    lastName: doctor.Cognoms
  };

  if (doctor.Sex) {
    const parsedSex = parseSex(doctor.Sex);
    if (parsedSex) {
      userData.sex = parsedSex;
    } else {
      console.warn(`Sexe no reconegut per a ${username}: ${doctor.Sex}`);
    }
  }

  if (doctor.DateOfBirth) {
    const parsedDate = parseDate(doctor.DateOfBirth);
    if (parsedDate) {
      userData.dateOfBirth = parsedDate;
    } else {
      console.warn(`Data de naixement no vàlida per a ${username}: ${doctor.DateOfBirth}`);
    }
  }

  try {
    const res = await axios.post(`${API_URL}/users`, userData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { ...res.data, exists: false, username, password };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Error creant usuari:', err.message, err.response?.data);
    } else {
      console.error('Error creant usuari:', err);
    }
    throw err;
  }
}

function generateMailHtml(doctor: any, user: any) {
  const templatePath = path.join(process.cwd(), 'scripts', 'mail-template.html');
  let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
  htmlTemplate = htmlTemplate
    .replace('{{Nom}}', doctor.Nom)
    .replace('{{username}}', user.username)
    .replace('{{password}}', user.password);
  return htmlTemplate;
}

// Si tenim MAIL_HOST configurat, usem SMTP directe (Alta acens). Si no, caiem al servei gmail per
// retrocompatibilitat amb el setup antic de proves.
function buildTransporter() {
  if (process.env.MAIL_HOST) {
    const port = Number(process.env.MAIL_PORT) || 465;
    const secure = process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : port === 465;
    // El TLS SNI/hostname que verifiquem pot ser diferent del MAIL_HOST quan el proveïdor
    // (ex: Acens) presenta un certificat per al seu hostname tècnic intern (relay) i no
    // pel hostname comercial del client. Per defecte usem MAIL_HOST; opcionalment es pot
    // sobreescriure amb MAIL_TLS_SERVERNAME.
    const tlsServerName = process.env.MAIL_TLS_SERVERNAME || process.env.MAIL_HOST;
    // Permet desactivar la verificació de cert en setups on Acens no publica un cert amb
    // el hostname comercial. Per defecte la verificació està activada (segur).
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
    // Mai interrompre l'execucio per un problema d'auditoria.
    console.warn("No s'ha pogut escriure el log d'auditoria de correu:", err);
  }
}

async function sendMail(doctor: any, user: any, mailHtml: string) {
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
    script: 'create-doctors-and-send-mails.ts',
    status: 'SENT',
    to: doctor.Email,
    username: user?.username || '',
    messageId: info.messageId || '',
    accepted: (info.accepted || []).map(String).join(';'),
    rejected: (info.rejected || []).map(String).join(';'),
    error: ''
  });
}

function generatePassword(length = 14) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Actualitza la fila del Google Sheet amb la contrasenya i la data d'enviament
async function updateSheet(rowIndex: number, password: string, mailSentAt: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!E${rowIndex}:F${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[password, mailSentAt]]
    }
  });
}

// Actualitza el camp Updates al Google Sheet (Columna K -> Index 10)
async function updateSheetUpdates(rowIndex: number, updatesMsg: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!K${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[updatesMsg]]
    }
  });
}

(async () => {
  try {
    // Resum de la configuració SMTP (sense exposar la contrasenya)
    console.log('--- Mail config ---');
    console.log(`  MAIL_HOST     : ${process.env.MAIL_HOST || '(no definit — fallback a service:gmail)'}`);
    console.log(`  MAIL_PORT     : ${process.env.MAIL_PORT || '(no definit)'}`);
    console.log(`  MAIL_SECURE   : ${process.env.MAIL_SECURE || '(no definit)'}`);
    console.log(`  MAIL_USER     : ${process.env.MAIL_USER || '(no definit)'}`);
    console.log(
      `  MAIL_FROM     : ${process.env.MAIL_FROM || `"Alta Medical Services" <${process.env.MAIL_USER || 'noreply@altamedicalservices.com'}>`}`
    );
    console.log(`  MAIL_AUDIT_LOG_PATH : ${MAIL_AUDIT_LOG_PATH}`);
    console.log(`  MAIL_ARCHIVE_BCC : ${MAIL_ARCHIVE_BCC || '(no definit — usa MAIL_USER per defecte)'}`);
    console.log(
      `  MAIL_PASSWORD : ${process.env.MAIL_PASSWORD ? '(set, len=' + process.env.MAIL_PASSWORD.length + ')' : "(NO DEFINIT — fallarà l'enviament)"}`
    );
    console.log('-------------------');

    // SMTP preflight: si no podem autenticar-nos contra el servidor de correu, avortem
    // ABANS de crear cap usuari. Així mai més tornem a la situació de "usuari creat però
    // mail no enviat" (com va passar amb el problema de DNS de correo.acens.net).
    try {
      const probe = buildTransporter();
      await probe.verify();
      console.log(`SMTP preflight OK — podem enviar correus.`);
    } catch (err) {
      console.error('✗ SMTP preflight KO — no s’executa res. Revisa MAIL_* al .env.');
      console.error(err);
      process.exit(1);
    }

    const token = await login();
    console.log('Logged in successfully');

    const groups = await getGroups(token);
    const groupsEntries: [string, string][] = (groups as Array<{ id: string; name: string }>).map((g) => [
      g.name,
      g.id
    ]);
    const groupsMap = new Map<string, string>(groupsEntries);
    console.log(`Loaded ${groupsMap.size} groups.`);

    const doctors = await getDoctors();
    console.log(`S'han recuperat ${doctors.length} files del full de càlcul.`);

    // Filtrem en aquest ordre:
    //   (1) Excloure usuaris de test (Tipus == "Usuari de test") — mai s'han de tocar.
    //   (2) Excloure els ja creats (tenen Password + MailSentAt).
    //   (3) Dels restants, processar només els que tinguin Signat = TRUE.
    const notTest = doctors.filter((d) => !isTestUser(d.Tipus));
    const testCount = doctors.length - notTest.length;
    const pending = notTest.filter((d) => !(d.Password && d.MailSentAt));
    const eligible = pending.filter((d) => isSigned(d.Signat));
    const skippedNotSigned = pending.filter((d) => !isSigned(d.Signat));

    console.log(`  · Usuaris de test (saltats):       ${testCount}`);
    console.log(`  · Ja creats (saltats):            ${notTest.length - pending.length}`);
    console.log(`  · Pendents NO signats (saltats):  ${skippedNotSigned.length}`);
    console.log(`  · Pendents SIGNATS (a processar): ${eligible.length}`);
    if (eligible.length) {
      console.log('    →', eligible.map((d) => `${d.Nom} ${d.Cognoms} <${d.Email || 'sense-email'}>`).join(' | '));
    }
    if (skippedNotSigned.length) {
      console.log('    ⨯ NO signats:', skippedNotSigned.map((d) => `${d.Nom} ${d.Cognoms}`).join(' | '));
    }

    let processedCount = 0;

    for (const doc of eligible) {
      processedCount++;

      // Guard: si està signat però no té email, no podem enviar.
      if (!doc.Email || !doc.Email.trim()) {
        const msg = `Saltat (signat però sense email): ${doc.Nom} ${doc.Cognoms}`;
        console.warn('⚠️ ', msg);
        await updateSheetUpdates(doc.rowIndex, msg);
        continue;
      }

      const password = generatePassword();
      let user;
      let updatesMsg = '';

      try {
        user = await createUserInApp(doc, password, token, groupsMap);
        if (user.exists) {
          updatesMsg = `Usuari ja existeix: ${user.username}`;
          await updateSheetUpdates(doc.rowIndex, updatesMsg);
          console.log(updatesMsg);
          continue;
        } else {
          updatesMsg = `Usuari creat: ${user.username}`;
        }
      } catch (err) {
        updatesMsg = `Error creant usuari: ${err}`;
        await updateSheetUpdates(doc.rowIndex, updatesMsg);
        console.error(updatesMsg);
        continue;
      }

      // 2. Envia el correu
      try {
        const mailHtml = generateMailHtml(doc, { ...user, password });
        await sendMail(doc, { ...user, password }, mailHtml);
        fs.writeFileSync(`mail_${user.username}.html`, mailHtml);

        const now = new Date().toISOString();
        // Actualitza Google Sheet
        await updateSheet(doc.rowIndex, user.password, now);
        await updateSheetUpdates(doc.rowIndex, updatesMsg + ' (mail enviat)');

        console.log(`Usuari creat i informat: ${user.username} (${doc.Email})`);
      } catch (err) {
        console.error(`Error enviant mail a ${doc.Email}:`, err);
        appendMailAudit({
          script: 'create-doctors-and-send-mails.ts',
          status: 'FAILED',
          to: doc.Email,
          username: user?.username || '',
          messageId: '',
          accepted: '',
          rejected: '',
          error: String(err)
        });
        await updateSheetUpdates(doc.rowIndex, updatesMsg + ' (error enviant mail)');
      }
    }

    if (processedCount === 0) {
      console.log('No hi ha usuaris nous pendents de processar.');
    }
    console.log('Script finalitzat.');
  } catch (err) {
    console.error('Script failed:', err);
  }
})();
