/**
 * reset-passwords-and-resend.ts
 *
 * Script de recuperació per a usuaris que ja s'han creat amb
 * `create-doctors-and-send-mails.ts` però per als quals NO s'ha pogut enviar
 * el correu (per exemple per un problema d'SMTP/DNS).
 *
 * Què fa:
 *   1. Llegeix el full de càlcul.
 *   2. Selecciona només les files Signades, no de test i que ENCARA no tenen
 *      `Password` ni `MailSentAt` informats (és a dir, les que van quedar
 *      "a mig fer" perquè el mail va petar).
 *   3. Per a cada fila:
 *        - Resol l'id de l'usuari (per `username` derivat de Nom + 1r cognom).
 *        - Genera una contrasenya nova i la posa via `PATCH /users/:id`.
 *        - Envia el mail amb les credencials.
 *        - Si tot ha anat bé, escriu `Password` + `MailSentAt` al full i
 *          actualitza la columna `Updates` amb el resultat.
 *
 * Idempotent: si tornes a executar i el mail ja s'havia enviat (té
 * Password + MailSentAt), salta la fila.
 *
 * NO esborra cap usuari. NO crea usuaris nous.
 */

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

console.log(`Using API URL candidates: ${API_CANDIDATES.join(' | ')}`);
console.log(`Using Admin Username: ${ADMIN_USERNAME}`);
console.log(`Using Admin Password Length: ${ADMIN_PASSWORD.length}`);

const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = 'Hoja 1';
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

function cleanString(str: string) {
  return removeAccents(str).replace(/[^a-zA-Z0-9]/g, '');
}

function buildUsername(nom: string, cognoms: string) {
  const initial = cleanString(nom.charAt(0).toLowerCase());
  const surname = cleanString(cognoms.split(' ')[0].toLowerCase());
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
  console.error('Error logging in:', lastError);
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
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure,
      requireTLS: !secure,
      tls: { servername: process.env.MAIL_HOST },
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
    subject: 'El teu accés a Alta Medical Services',
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
    `   ✉  SMTP host=${process.env.MAIL_HOST || 'gmail-service'} | from=${fromAddress} | to=${doctor.Email} | messageId=${info.messageId} | accepted=${JSON.stringify(info.accepted)} | rejected=${JSON.stringify(info.rejected)}`
  );
}

async function updateSheet(rowIndex: number, password: string, mailSentAt: string) {
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
    console.log('--- Mail config ---');
    console.log(`  MAIL_HOST     : ${process.env.MAIL_HOST || '(no definit — caurà a Gmail)'}`);
    console.log(`  MAIL_PORT     : ${process.env.MAIL_PORT || '(per defecte 465)'}`);
    console.log(`  MAIL_SECURE   : ${process.env.MAIL_SECURE || '(per defecte derivat del port)'}`);
    console.log(`  MAIL_USER     : ${process.env.MAIL_USER || '(no definit)'}`);
    console.log(`  MAIL_FROM     : ${process.env.MAIL_FROM || '(no definit — usa MAIL_USER)'}`);
    console.log(
      `  MAIL_PASSWORD : ${process.env.MAIL_PASSWORD ? '(set, len=' + process.env.MAIL_PASSWORD.length + ')' : "(NO DEFINIT — fallarà l'enviament)"}`
    );
    console.log('-------------------');

    const token = await login();
    const allUsers = await getAllUsers(token);
    const usersByUsername = new Map<string, string>();
    for (const u of allUsers) usersByUsername.set(u.username, u.id);
    console.log(`Carregats ${allUsers.length} usuaris des de l'API.`);

    const doctors = await getDoctors();
    console.log(`S'han recuperat ${doctors.length} files del full de càlcul.`);

    const notTest = doctors.filter((d) => !isTestUser(d.Tipus));
    const pending = notTest.filter((d) => !(d.Password && d.MailSentAt));
    const signed = pending.filter((d) => isSigned(d.Signat));

    const skippedTest = doctors.length - notTest.length;
    const alreadyDone = notTest.length - pending.length;
    const notSigned = pending.length - signed.length;

    console.log(`  · Usuaris de test (saltats):       ${skippedTest}`);
    console.log(`  · Ja fets (Password+MailSentAt):  ${alreadyDone}`);
    console.log(`  · Pendents NO signats (saltats):  ${notSigned}`);
    console.log(`  · Pendents SIGNATS (a reenviar):  ${signed.length}`);

    if (signed.length > 0) {
      console.log(`    → ${signed.map((d) => `${d.Nom} ${d.Cognoms} <${d.Email}>`).join(' | ')}`);
    }

    let okCount = 0;
    let failCount = 0;

    for (const doc of signed) {
      if (!doc.Email || !doc.Email.includes('@')) {
        const msg = `Saltat (signat però sense email): ${doc.Nom} ${doc.Cognoms}`;
        console.warn('⚠️ ', msg);
        await updateSheetUpdates(doc.rowIndex, msg);
        failCount++;
        continue;
      }

      const username = buildUsername(doc.Nom, doc.Cognoms);
      const userId = usersByUsername.get(username);

      if (!userId) {
        const msg = `Usuari "${username}" NO trobat a l'API — salto (cal crear-lo abans amb create-doctors-and-send-mails).`;
        console.warn('⚠️ ', msg);
        await updateSheetUpdates(doc.rowIndex, msg);
        failCount++;
        continue;
      }

      const newPassword = generatePassword();

      try {
        await setPassword(userId, newPassword, token);
      } catch (err) {
        const msg = `Error resetejant contrasenya de ${username}: ${axios.isAxiosError(err) ? err.response?.status + ' ' + JSON.stringify(err.response?.data) : String(err)}`;
        console.error('✗', msg);
        await updateSheetUpdates(doc.rowIndex, msg);
        failCount++;
        continue;
      }

      try {
        const mailHtml = generateMailHtml(doc, { username, password: newPassword });
        await sendMail(doc, { username, password: newPassword }, mailHtml);
        fs.writeFileSync(`mail_${username}.html`, mailHtml);

        const now = new Date().toISOString();
        await updateSheet(doc.rowIndex, newPassword, now);
        await updateSheetUpdates(doc.rowIndex, `Reset+resend OK (${now})`);

        console.log(`✔ Reset+mail enviat: ${username} (${doc.Email})`);
        okCount++;
      } catch (err) {
        const msg = `Error enviant mail a ${doc.Email} després del reset: ${String(err)}`;
        console.error('✗', msg);
        // Important: la contrasenya ja s'ha canviat a la BD. La deixem registrada al sheet
        // perquè si el mail ha petat per un altre motiu (ex: SMTP transitori) puguis donar-la
        // manualment a l'usuari, i la propera execució no torni a generar-ne una de nova.
        const now = new Date().toISOString();
        await updateSheet(doc.rowIndex, newPassword, now);
        await updateSheetUpdates(doc.rowIndex, `Reset OK però mail KO (${now}) — ${msg.substring(0, 200)}`);
        failCount++;
      }
    }

    console.log(`\nResum: ${okCount} OK | ${failCount} KO | ${signed.length} total processats.`);
    console.log('Script finalitzat.');
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
})();
