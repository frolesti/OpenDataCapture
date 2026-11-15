import { formatTheraDate } from '@opendatacapture/schemas/thera';
import type { TheraVisit } from '@opendatacapture/schemas/thera';

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

export function renderTheraReminderEmail(data: TheraReminderEmailData) {
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

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Recordatorio THERA-SGM-2026</title>
  </head>
  <body style="background:#f6f8fb;font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0">
    <div style="box-sizing:border-box;max-width:520px;width:100%;margin:48px auto;background:#fff;border-radius:16px;box-shadow:0 6px 32px rgba(100,100,150,.18),0 1.5px 6px rgba(100,100,150,.1);padding:32px 24px;text-align:center;border:1px solid #ececec">
      <div style="text-align:center;margin-bottom:24px">
        <img src="cid:logo-alta" alt="ALTA medical services" width="170" style="display:block;margin:0 auto;max-width:100%;height:auto" />
      </div>
      <div style="font-size:1.1rem;margin-bottom:16px;color:#222">${escapeHtml(greeting)}:</div>
      <p style="text-align:left;color:#333;line-height:1.6">${reminder}</p>
      <div style="background:#f6f8fb;border-radius:8px;padding:16px;margin-bottom:24px;font-size:1rem;color:#333;text-align:left">
        <strong>Código de paciente:</strong> ${escapeHtml(data.patientCode)}<br />
        <strong>Periodo permitido:</strong> ${min} – ${max}
      </div>
      <a href="https://altahealthdata.com/auth/login" style="display:block;width:100%;box-sizing:border-box;background:#a7a6f9;color:#fff;border-radius:8px;padding:12px 0;font-size:1.1rem;font-weight:bold;text-decoration:none;margin:8px 0 16px">
        Acceder a la plataforma
      </a>
      <div style="font-size:.95rem;color:#555;margin-top:24px;text-align:left;line-height:1.6">
        Registre la fecha real de la visita dentro del periodo indicado. Las visitas anteriores deben estar guardadas.
      </div>
      <div style="font-size:.95rem;color:#888;text-align:left">
        <br />Reciba un cordial saludo,<br />
        El equipo de Alta Medical Services
      </div>
    </div>
  </body>
</html>`;
}
