export type WelcomeEmailData = {
  firstName: string;
  lastName: string;
  password: string;
  professionalTitle: string | null | undefined;
  username: string;
};

export function validateWelcomeEmailRecipient(
  data: Pick<WelcomeEmailData, 'firstName' | 'lastName' | 'professionalTitle'>
) {
  if (data.professionalTitle !== 'Dr' && data.professionalTitle !== 'Dra') {
    throw new Error('Seleccione explícitamente el tratamiento Dr. o Dra. antes de enviar las credenciales.');
  }
  if (!data.firstName.trim() || !data.lastName.trim()) {
    throw new Error('El correo de credenciales requiere el nombre y los apellidos del investigador.');
  }
}

export function renderWelcomeEmail(template: string, data: WelcomeEmailData) {
  validateWelcomeEmailRecipient(data);
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  const values = {
    greeting: `${data.professionalTitle === 'Dra' ? 'Estimada' : 'Estimado'} ${data.professionalTitle}. ${data.firstName.trim()} ${data.lastName.trim()}`,
    password: data.password,
    username: data.username
  };
  return template
    .replace('src="./alta-medical-services-logo.png"', 'src="cid:logo-alta"')
    .replace(/\{\{(greeting|username|password)\}\}/g, (_match, key: keyof typeof values) => escapeHtml(values[key]));
}
import fs from 'node:fs';
import path from 'node:path';

export function readMailTemplate() {
  const templatePath = [
    'public/mail-template.html',
    '../public/mail-template.html',
    'apps/api/public/mail-template.html'
  ]
    .map((candidate) => path.resolve(process.cwd(), candidate))
    .find((candidate) => fs.existsSync(candidate));
  if (!templatePath) throw new Error('Onboarding email template is missing');
  return fs.readFileSync(templatePath, 'utf8');
}
