import { formatTheraDate } from '@opendatacapture/schemas/thera';
import type { TheraVisit } from '@opendatacapture/schemas/thera';

import { readMailTemplate } from '../users/welcome-email';

export type TheraReminderEmailData = {
  firstName: string;
  lastName: string;
  patientCode: string;
  professionalTitle: null | string;
  stage: 'advance' | 'open';
  visit: TheraVisit;
  window: { min: string; max: string };
};

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

export function renderTheraReminderEmail(data: TheraReminderEmailData, template = readMailTemplate()) {
  const title = data.professionalTitle === 'Dra' ? 'Dra.' : data.professionalTitle === 'Dr' ? 'Dr.' : '';
  const salutation =
    data.professionalTitle === 'Dra' ? 'Estimada' : data.professionalTitle === 'Dr' ? 'Estimado' : 'Hola';
  const greeting = [salutation, title, data.firstName, data.lastName].filter(Boolean).join(' ');
  const visitName = {
    V0: 'Visita basal',
    V1: 'Primera visita',
    V2: 'Segunda visita',
    V3: 'Tercera visita',
    V4: 'Cuarta visita'
  }[data.visit];
  const min = formatTheraDate(data.window.min);
  const max = formatTheraDate(data.window.max);
  if (!min || !max) throw new Error('Invalid THERA reminder window');
  const reminder =
    data.stage === 'advance'
      ? `La ventana para la ${visitName.toLowerCase()} se abre el ${min}.`
      : `La ventana para la ${visitName.toLowerCase()} está abierta hasta el ${max}.`;

  const replace = (pattern: RegExp, content: string) => {
    if (!pattern.test(template)) throw new Error('Invalid shared mail template for THERA reminders');
    template = template.replace(pattern, () => content);
  };
  replace(/<title>[^<]*<\/title>/, '<title>Recordatorio THERA-SGM-2026</title>');
  replace(/\{\{greeting\}\}/, escapeHtml(greeting));
  replace(
    /(<p style="text-align: left; color: #333; line-height: 1\.6">)[\s\S]*?<\/p>/,
    `<p style="text-align: left; color: #333; line-height: 1.6">${reminder}</p>`
  );
  replace(
    /<div class="info">[\s\S]*?<\/div>/,
    `<div class="info"><strong>Estudio:</strong> THERA-SGM-2026 · ${data.visit.toLowerCase()}<br />
        <strong>Código de paciente:</strong> ${escapeHtml(data.patientCode)}<br />
        <strong>Periodo permitido:</strong> ${min} – ${max}</div>`
  );
  replace(
    /(<div class="footer"[^>]*>)[\s\S]*?(?=Si necesita ayuda)/,
    `<div class="footer" style="line-height: 1.6; color: #555">Registre la fecha real de la visita dentro del periodo indicado.<br /><br />
        `
  );
  return template.replace('src="./alta-medical-services-logo.png"', 'src="cid:logo-alta"');
}
