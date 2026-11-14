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
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]!
  );

export function renderTheraReminderEmail(data: TheraReminderEmailData) {
  const title = data.professionalTitle === 'Dra' ? 'Dra.' : data.professionalTitle === 'Dr' ? 'Dr.' : '';
  const greeting = `${title} ${data.firstName} ${data.lastName}`.trim();
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
  const heading =
    data.stage === 'advance' ? 'Se acerca la apertura de la próxima visita' : 'El periodo de la visita ya está abierto';
  return `<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recordatorio THERA-SGM-2026</title></head>
<body style="margin:0;background:#f3f6fb;color:#26334d;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #e1e5ee;border-radius:12px">
      <tr><td style="padding:24px 32px;background:#9794f5;color:#fff"><strong style="font-size:24px">ALTA</strong><br><span style="font-size:12px">medical services</span></td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 20px">Hola, ${escapeHtml(greeting)}:</p>
        <h1 style="font-size:22px;margin:0 0 16px">${heading}</h1>
        <p style="line-height:1.6">Le recordamos la visita pendiente del estudio <strong>THERA-SGM-2026</strong>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;line-height:1.8;border-top:1px solid #e1e5ee;border-bottom:1px solid #e1e5ee;margin:24px 0">
          <tr><td style="padding:12px 0"><strong>Código del paciente</strong><br>${escapeHtml(data.patientCode)}</td></tr>
          <tr><td><strong>Visita</strong><br>${data.visit.toLowerCase()} · ${visitName}</td></tr>
          <tr><td style="padding:12px 0"><strong>Periodo permitido</strong><br>${min} — ${max}, ambos incluidos</td></tr>
        </table>
        <p style="line-height:1.6">${
          data.stage === 'advance'
            ? `Podrá abrir el formulario a partir del ${min}, siempre que las visitas anteriores estén guardadas.`
            : `Ya puede acceder al formulario de esta visita hasta el ${max}, siempre que las visitas anteriores estén guardadas.`
        }</p>
        <p style="margin:28px 0"><a href="https://altahealthdata.com/instruments/accessible-instruments" style="display:inline-block;padding:14px 22px;border-radius:6px;background:#8f8df2;color:#fff;text-decoration:none;font-weight:bold">Acceder al estudio</a></p>
        <p style="font-size:13px;line-height:1.6;color:#667085">El acceso requiere iniciar sesión. Registre la fecha real de la visita dentro del periodo permitido. Este correo no contiene respuestas clínicas ni nombres de pacientes.</p>
        <p style="margin:24px 0 0">Atentamente,<br>El equipo de Alta Medical Services</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
