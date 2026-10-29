import fs from 'node:fs';
import path from 'node:path';

import { renderWelcomeEmail, validateWelcomeEmailRecipient } from '../apps/api/src/users/welcome-email';

type DoctorRecipient = { Nom: string; Cognoms: string; Tractament?: string };

function recipientData(doctor: DoctorRecipient) {
  return {
    firstName: doctor.Nom,
    lastName: doctor.Cognoms,
    professionalTitle: doctor.Tractament?.trim().replace(/\.$/, '')
  };
}

export function validateDoctorWelcomeRecipient(doctor: DoctorRecipient) {
  validateWelcomeEmailRecipient(recipientData(doctor));
}

export function generateDoctorWelcomeEmail(doctor: DoctorRecipient, user: { username: string; password: string }) {
  return renderWelcomeEmail(
    fs.readFileSync(path.resolve(import.meta.dirname, '../apps/api/public/mail-template.html'), 'utf8'),
    { ...recipientData(doctor), ...user }
  );
}
