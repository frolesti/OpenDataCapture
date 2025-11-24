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

const API_URL = process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/v1` : 'http://localhost:5500/v1';
// Use specific env vars for this script, or fallback to the known working credentials
const ADMIN_USERNAME = process.env.SCRIPT_ADMIN_USERNAME || 'frolesti';
const ADMIN_PASSWORD = process.env.SCRIPT_ADMIN_PASSWORD || 'FRoy116699';

console.log(`Using API URL: ${API_URL}`);
console.log(`Using Admin Username: ${ADMIN_USERNAME}`);
// Do not log password for security, but we can log its length or a hash if needed for debugging.
console.log(`Using Admin Password Length: ${ADMIN_PASSWORD.length}`);

// Configura Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = 'Hoja 1';
const range = `${sheetName}!A2:K`; // Assumeix capçalera a la fila 1, ara fins a Updates (K)

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
  rowIndex: number;
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
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    return res.data.accessToken;
  } catch (err) {
    console.error('Error logging in:', err);
    throw err;
  }
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

async function sendMail(doctor: any, user: any, mailHtml: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'frolesti4@gmail.com',
      pass: 'omhj bvqa cprv heic'
    }
  });

  await transporter.sendMail({
    from: '"OpenDataCapture" <noreply@opendatacapture.org>',
    to: doctor.Email,
    subject: 'El teu accés a OpenDataCapture',
    html: mailHtml,
    attachments: [
      {
        filename: 'alta-medical-services-logo.png',
        path: join(__dirname, '../alta-medical-services-logo.png'),
        cid: 'logo-alta'
      }
    ]
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
    const token = await login();
    console.log('Logged in successfully');

    const groups = await getGroups(token);
    const groupsMap = new Map(groups.map((g: any) => [g.name, g.id]));
    console.log(`Loaded ${groupsMap.size} groups.`);

    const doctors = await getDoctors();
    console.log(`S'han recuperat ${doctors.length} files del full de càlcul.`);

    let processedCount = 0;

    for (const doc of doctors) {
      // Si ja té contrasenya i data d'enviament, salta
      if (doc.Password && doc.MailSentAt) {
        continue;
      }

      processedCount++;
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
