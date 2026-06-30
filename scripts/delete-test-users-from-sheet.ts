import 'dotenv/config';
import axios from 'axios';
import removeAccents from 'remove-accents';
import { google } from 'googleapis';

const DRY_RUN = parseBool(process.env.DRY_RUN, true);
const REQUIRE_SIGNED = parseBool(process.env.REQUIRE_SIGNED, false);
const UPDATE_SHEET_UPDATES = parseBool(process.env.UPDATE_SHEET_UPDATES, false);

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:5500').replace(/\/$/, '');
const API_CANDIDATES = Array.from(new Set([`${API_BASE}/v1`, `${API_BASE}/api/v1`]));
let API_URL = API_CANDIDATES[0];

const ADMIN_USERNAME = process.env.SCRIPT_ADMIN_USERNAME || 'frolesti';
const ADMIN_PASSWORD = process.env.SCRIPT_ADMIN_PASSWORD || 'FRoy116699';

const spreadsheetId = process.env.SHEET_ID || '1RO4R4oGhdG9DMlUoNkut7X7ZZSgmk_u0sNE-OwkPWhQ';
const sheetName = process.env.SHEET_NAME || 'Hoja 1';
const range = `${sheetName}!A2:M`;

interface SheetRow {
  Nom: string;
  Cognoms: string;
  Email: string;
  Tipus: string;
  Signat: string;
  rowIndex: number;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'si'].includes(value.trim().toLowerCase());
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
  const v = value.trim().toLowerCase();
  return v.startsWith('usuari de test') || v.includes('test');
}

function cleanString(str: string): string {
  return removeAccents(str || '').replace(/[^a-zA-Z0-9]/g, '');
}

function buildUsername(nom: string, cognoms: string): string {
  const initial = cleanString((nom || '').charAt(0).toLowerCase());
  const surname = cleanString((cognoms || '').split(' ')[0].toLowerCase());
  return `${initial}${surname}`;
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
      return res.data.accessToken as string;
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

async function getSheetRows(sheets: any): Promise<SheetRow[]> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (
    res.data.values?.map((row: string[], idx: number) => ({
      Nom: row[0] || '',
      Cognoms: row[1] || '',
      Email: row[2] || '',
      Tipus: row[12] || '',
      Signat: row[11] || '',
      rowIndex: idx + 2
    })) || []
  );
}

async function getAllUsers(token: string): Promise<Array<{ id: string; username: string }>> {
  const res = await axios.get(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

async function deleteUser(userId: string, token: string) {
  await axios.delete(`${API_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateSheetUpdates(sheets: any, rowIndex: number, msg: string) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!K${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[msg]] }
  });
}

async function main() {
  console.log(`Using API URL candidates: ${API_CANDIDATES.join(' | ')}`);
  console.log(`DRY_RUN=${DRY_RUN} | REQUIRE_SIGNED=${REQUIRE_SIGNED} | UPDATE_SHEET_UPDATES=${UPDATE_SHEET_UPDATES}`);

  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const token = await login();
  const apiUsers = await getAllUsers(token);
  const usersByUsername = new Map(apiUsers.map((u) => [u.username, u.id]));

  const rows = await getSheetRows(sheets);
  const testRows = rows.filter((r) => isTestUser(r.Tipus)).filter((r) => (REQUIRE_SIGNED ? isSigned(r.Signat) : true));

  console.log(`Test rows detected in sheet: ${testRows.length}`);

  let found = 0;
  let deleted = 0;
  let missing = 0;
  let failed = 0;

  for (const row of testRows) {
    const username = buildUsername(row.Nom, row.Cognoms);
    const userId = usersByUsername.get(username);

    if (!userId) {
      console.log(`MISSING | ${username} | ${row.Nom} ${row.Cognoms} | ${row.Email}`);
      if (UPDATE_SHEET_UPDATES && !DRY_RUN) {
        await updateSheetUpdates(
          sheets,
          row.rowIndex,
          `Test user delete KO (${new Date().toISOString()}) - user not found in API`
        );
      }
      missing++;
      continue;
    }

    found++;

    if (DRY_RUN) {
      console.log(`DRY_DELETE | ${username} | id=${userId} | ${row.Nom} ${row.Cognoms}`);
      continue;
    }

    try {
      await deleteUser(userId, token);
      console.log(`DELETED | ${username} | id=${userId} | ${row.Nom} ${row.Cognoms}`);
      if (UPDATE_SHEET_UPDATES) {
        await updateSheetUpdates(sheets, row.rowIndex, `Test user deleted (${new Date().toISOString()})`);
      }
      deleted++;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `${err.response?.status || 'NO_STATUS'} ${JSON.stringify(err.response?.data || err.message)}`
        : String(err);
      console.log(`FAILED | ${username} | ${msg}`);
      if (UPDATE_SHEET_UPDATES) {
        await updateSheetUpdates(
          sheets,
          row.rowIndex,
          `Test user delete KO (${new Date().toISOString()}) - ${msg.slice(0, 180)}`
        );
      }
      failed++;
    }
  }

  console.log('\nSummary');
  console.log(`Found in API: ${found}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Missing in API: ${missing}`);
  console.log(`Failed deletes: ${failed}`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
