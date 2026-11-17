/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import type { FormInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export const THERA_NAMES = {
  V0: 'THERA_SGM_2026_V0',
  V1: 'THERA_SGM_2026_V1',
  V2: 'THERA_SGM_2026_V2',
  V3: 'THERA_SGM_2026_V3',
  V4: 'THERA_SGM_2026_V4'
} as const;

export type TheraVisit = keyof typeof THERA_NAMES;
export const THERA_VISIT_ORDER: readonly TheraVisit[] = ['V0', 'V1', 'V2', 'V3', 'V4'];
export const THERA_RETIRED_INSTRUMENT_NAME = 'THERA_SGM_2026_END';

export const THERA_INCLUSIONS = ['inclusion_1', 'inclusion_2', 'inclusion_3', 'inclusion_4'] as const;
export const THERA_EXCLUSIONS = [
  'exclusion_1',
  'exclusion_2',
  'exclusion_3',
  'exclusion_4',
  'exclusion_5',
  'exclusion_6'
] as const;
export const THERA_VAGINAL_ITEMS = ['vhi_elasticity', 'vhi_secretions', 'vhi_ph', 'vhi_epithelium', 'vhi_moisture'];
export const THERA_VULVAR_ITEMS = [
  'vulvar_labia',
  'vulvar_clitoris',
  'vulvar_vestibule',
  'vulvar_color',
  'vulvar_pain'
];

export function getTheraVisit(name: string): TheraVisit | undefined {
  return (Object.keys(THERA_NAMES) as TheraVisit[]).find((visit) => THERA_NAMES[visit] === name);
}

export function isTheraPatientCode(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseTheraDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}

export function theraDateToISO(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const display = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const canonical = display ? `${display[3]}-${display[2]}-${display[1]}` : value;
  return parseTheraDate(canonical) ? canonical : undefined;
}

export function formatTheraDate(value: unknown): string | undefined {
  const canonical = theraDateToISO(value);
  return canonical ? `${canonical.slice(8, 10)}/${canonical.slice(5, 7)}/${canonical.slice(0, 4)}` : undefined;
}

export function theraToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function theraSum(data: { [key: string]: unknown }, keys: readonly string[]): number | undefined {
  if (!keys.every((key) => typeof data[key] === 'number' && Number.isFinite(data[key]))) return undefined;
  return keys.reduce((total, key) => total + (data[key] as number), 0);
}

export function isTheraEligible(data: { [key: string]: unknown }): boolean {
  const vhi = theraSum(data, THERA_VAGINAL_ITEMS);
  return (
    data.informed_consent === 'si' &&
    THERA_INCLUSIONS.every((key) => data[key] === 'si') &&
    THERA_EXCLUSIONS.every((key) => data[key] === 'no') &&
    typeof data.age === 'number' &&
    data.age >= 18 &&
    ((vhi !== undefined && vhi < 15) ||
      (typeof data.eva_dryness === 'number' && data.eva_dryness >= 5) ||
      (typeof data.eva_dyspareunia === 'number' && data.eva_dyspareunia >= 5))
  );
}

export function theraVisitWindow(visit: TheraVisit, reference: string): undefined | { max: string; min: string } {
  const settings = { V1: [1, 7], V2: [3, 14], V3: [6, 28], V4: [12, 45] } as const;
  if (visit === 'V0') return undefined;
  const date = parseTheraDate(reference);
  if (!date) return undefined;
  const [months, days] = settings[visit];
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  const min = new Date(date);
  const max = new Date(date);
  min.setUTCDate(min.getUTCDate() - days);
  max.setUTCDate(max.getUTCDate() + days);
  return { max: max.toISOString().slice(0, 10), min: min.toISOString().slice(0, 10) };
}

export type TheraStoredVisit = {
  data: { [key: string]: unknown };
  id: string;
  visit: TheraVisit;
};

export function theraPatientContext(records: TheraStoredVisit[], patientCode: string) {
  const patient = records.filter((record) => record.data.patient_code === patientCode);
  const baseline = patient.find((record) => record.visit === 'V0');
  const first = patient.find((record) => record.visit === 'V1');
  return { baseline, first, patient };
}

export function missingTheraPrerequisite(visit: TheraVisit, records: TheraStoredVisit[], patientCode: string) {
  const patient = records.filter((record) => record.data.patient_code === patientCode);
  return THERA_VISIT_ORDER.slice(0, THERA_VISIT_ORDER.indexOf(visit)).find(
    (previous) => !patient.some((record) => record.visit === previous)
  );
}

export function canStartTheraVisit(visit: TheraVisit, records: TheraStoredVisit[], patientCode: string): boolean {
  if (visit === 'V0') return true;
  const { baseline, patient } = theraPatientContext(records, patientCode);
  return (
    isTheraPatientCode(patientCode) &&
    Boolean(baseline && isTheraEligible(baseline.data)) &&
    !missingTheraPrerequisite(visit, records, patientCode) &&
    !patient.some((record) => record.visit === visit || record.visit === 'V4')
  );
}

export function theraPatientVisitWindow(visit: TheraVisit, records: TheraStoredVisit[], patientCode: string) {
  const { baseline, first } = theraPatientContext(records, patientCode);
  const reference = theraDateToISO(visit === 'V1' ? baseline?.data.visit_date : first?.data.visit_date);
  return reference ? theraVisitWindow(visit, reference) : undefined;
}

export function canOpenTheraVisit(
  visit: TheraVisit,
  records: TheraStoredVisit[],
  patientCode: string,
  today = theraToday()
): boolean {
  if (!canStartTheraVisit(visit, records, patientCode)) return false;
  if (visit === 'V0') return true;
  const window = theraPatientVisitWindow(visit, records, patientCode);
  return Boolean(parseTheraDate(today) && window && today >= window.min && today <= window.max);
}

export function theraVisitDateError(visit: TheraVisit, data: { [key: string]: unknown }): string | undefined {
  const date = theraDateToISO(data.visit_date);
  if (!date) {
    return data.visit_date === undefined || data.visit_date === ''
      ? 'Este campo es obligatorio'
      : 'Introduzca una fecha válida (DD/MM/AAAA)';
  }
  const messages: string[] = [];
  const testDates = data._thera_test_dates === true;
  if (!testDates && date > theraToday()) messages.push('La fecha no puede ser futura.');
  if (visit !== 'V0') {
    const reference = theraDateToISO(visit === 'V1' ? data.baseline_date : data.first_visit_date);
    const window = reference ? theraVisitWindow(visit, reference) : undefined;
    if (!window) messages.push('Se requiere una fecha de referencia guardada válida.');
    else if (!testDates && (date < window.min || date > window.max)) {
      messages.push(
        `La visita debe realizarse entre ${formatTheraDate(window.min)} y ${formatTheraDate(window.max)}, ambos incluidos.`
      );
    }
    const baseline = theraDateToISO(data.baseline_date);
    if (baseline && date < baseline) messages.push('La visita no puede preceder a la visita basal.');
    if (visit !== 'V1' && reference && date < reference) {
      messages.push('La visita no puede preceder a la primera visita.');
    }
  }
  return messages.length ? messages.join(' ') : undefined;
}

export function validateTheraVisit(
  visit: TheraVisit,
  data: { [key: string]: unknown },
  records: TheraStoredVisit[],
  editingId?: string,
  allowTestDates = false
): string | undefined {
  if (!isTheraPatientCode(data.patient_code)) return 'Código de paciente THERA no válido.';
  if (
    records.some(
      (record) => record.id !== editingId && record.visit === visit && record.data.patient_code === data.patient_code
    )
  ) {
    return 'Ya existe esta visita para el código de paciente.';
  }
  const { baseline, first, patient } = theraPatientContext(records, data.patient_code);
  const visitDate = data.visit_date;
  if (!parseTheraDate(visitDate) || typeof visitDate !== 'string' || (!allowTestDates && visitDate > theraToday())) {
    return 'La fecha de visita debe ser válida y no puede ser futura.';
  }
  if (visit === 'V0') return undefined;
  if (!baseline || !isTheraEligible(baseline.data)) return 'Se requiere una visita basal apta para este paciente.';
  if (data.baseline_date !== baseline.data.visit_date || data.site_hospital !== baseline.data.site_hospital) {
    return 'La fecha basal y el hospital deben coincidir con la visita basal guardada.';
  }
  if (!editingId && patient.some((record) => record.visit === 'V4')) {
    return 'El estudio ya está completado con la cuarta visita.';
  }
  if (visitDate < String(baseline.data.visit_date)) return 'La fecha no puede ser anterior a la visita basal.';
  if (visit !== 'V1' && !first) return 'Se requiere la visita V1 (pauta completa) guardada.';
  if (visit !== 'V1' && data.first_visit_date !== first?.data.visit_date) {
    return 'La fecha de pauta completa debe coincidir con la visita V1 guardada.';
  }
  const missing = missingTheraPrerequisite(visit, records, data.patient_code);
  if (missing) return `Se requiere la visita ${missing} guardada antes de registrar la visita ${visit}.`;
  const previous = patient.find((record) => record.visit === THERA_VISIT_ORDER[THERA_VISIT_ORDER.indexOf(visit) - 1]);
  const previousDate = theraDateToISO(previous?.data.visit_date);
  if (previousDate && visitDate < previousDate)
    return 'La fecha no puede ser anterior a la visita precedente guardada.';
  const window = theraVisitWindow(visit, String(visit === 'V1' ? baseline.data.visit_date : first?.data.visit_date));
  if (!window) return 'No se puede calcular la ventana de visita.';
  return theraVisitDateError(visit, { ...data, _thera_test_dates: allowTestDates });
}

type Values = { [key: string]: unknown };
type Field = FormInstrument.StaticField<'en'>;
type Fields = FormInstrument.Fields<FormInstrument.Data, 'en'>;
type Group = FormInstrument.FieldsGroup<FormInstrument.Data, 'en'>;

const yesNo = { si: 'Sí', no: 'No' };
const requiredText = z.string().trim().min(1, 'Este campo es obligatorio');
const dateSchema = z
  .union([z.string(), z.date(), z.undefined()], {
    errorMap: (_issue, context) => ({
      message: context.data === undefined ? 'Este campo es obligatorio' : 'Introduzca una fecha válida (DD/MM/AAAA)'
    })
  })
  .transform((value, context) => {
    const canonical = theraDateToISO(value);
    if (!canonical) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          value === undefined || value === '' ? 'Este campo es obligatorio' : 'Introduzca una fecha válida (DD/MM/AAAA)'
      });
      return undefined;
    }
    return canonical;
  });
const optionalDate = dateSchema.optional();
const clinicalVisibilityDeps = ['informed_consent', 'consent_date', ...THERA_INCLUSIONS];

const requiredLabel = (label: string) => (label.endsWith(' *') ? label : `${label} *`);
const radio = (label: string, options: { [key: string]: string } = yesNo): FormInstrument.StringField<'en'> => ({
  kind: 'string',
  variant: 'radio',
  label: requiredLabel(label),
  options
});
const text = (label: string, required = true): FormInstrument.StringField<'en'> => ({
  kind: 'string',
  variant: 'input',
  label: required ? requiredLabel(label) : label
});
const dateField = (
  label: string,
  disabled = false
): FormInstrument.DateField<'en'> & { displayFormat: 'dd/MM/yyyy' } => ({
  kind: 'date',
  displayFormat: 'dd/MM/yyyy',
  label: disabled ? label : requiredLabel(label),
  disabled
});
const numeric = (label: string, min: number, max?: number): Field => ({
  kind: 'number',
  variant: 'input',
  label: requiredLabel(label),
  min,
  ...(max === undefined ? {} : { max })
});
const score = (label: string, options: { [key: number]: string }): Field => ({
  kind: 'number',
  variant: 'radio',
  label: requiredLabel(label),
  options
});
const optionsFrom = (labels: string[], start = 1): { [key: number]: string } =>
  Object.fromEntries(labels.map((label, index) => [index + start, label]));

function conditional(field: Field, deps: string[], predicate: (data: Values) => boolean) {
  return {
    kind: 'dynamic' as const,
    deps,
    render: (data: FormInstrument.PartialData) => (predicate(data) ? field : null)
  };
}

const vaginalLabels: [string, string[]][] = [
  ['Elasticidad vaginal', ['Ausente', 'Escasa', 'Aceptable', 'Buena', 'Excelente']],
  ['Volumen de flujo', ['Ausente', 'Escaso', 'Capa fina en la superficie', 'Capa moderada', 'Normal']],
  ['pH vaginal', ['> 6.1', '5.6 a 6', '5.5', '4.7 a 6', '< 4.6']],
  [
    'Integridad del epitelio',
    ['Petequias espontáneas', 'Sangra al menor contacto', 'Sangra al rascado', 'Epitelio no friable', 'Normal']
  ],
  ['Humedad', ['Ausente, superficie inflamada', 'Ausente, superficie normal', 'Mínima', 'Moderada', 'Normal']]
];
const vulvarLabels: [string, string[]][] = [
  ['Labios mayores y menores', ['Normal', 'Pérdida leve', 'Pérdida moderada', 'Pérdida leve o desaparición']],
  [
    'Clítoris',
    [
      'Tamaño normal',
      'Disminución leve tamaño',
      'Disminución moderada tamaño',
      'Disminución severa tamaño o indetectable'
    ]
  ],
  [
    'Vestíbulo y elasticidad',
    ['Normal', 'Disminución o estenosis leve', 'Disminución o estenosis moderada', 'Disminución o estenosis severa']
  ],
  ['Color', ['Normal', 'Palidez leve', 'Palidez moderada', 'Palidez severa']],
  ['Molestias y dolor', ['No', 'Leve durante coito', 'Moderado durante coito', 'Severo durante coito']]
];
const fsfiQuestions = [
  '¿Con qué frecuencia experimentó deseo o interés sexual?',
  '¿Con qué frecuencia sintió excitación sexual durante la actividad sexual o coito vaginal?',
  '¿Con qué frecuencia consiguió lubricación vaginal (humedad vaginal) durante la actividad sexual o coito vaginal?',
  'Cuando tuvo una estimulación sexual o coito vaginal, ¿con qué frecuencia consiguió el orgasmo (clímax)?',
  '¿Cuánta satisfacción sintió con su vida sexual en general?',
  '¿Con cuánta frecuencia sintió molestias o dolor después del coito vaginal?'
];
const frequency = {
  siempre: 'Casi siempre o siempre',
  mayoria: 'La mayoría de las veces (más de la mitad de las veces)',
  mitad: 'A veces (aproximadamente la mitad de las veces)',
  pocas: 'Pocas veces (menos de la mitad de las veces)',
  nunca: 'Casi nunca o nunca'
};
const cervantesQuestions = [
  'Tengo sensación de sequedad en mis genitales (vulva o vagina)',
  'Tengo molestias en mis genitales, como escozor, ardor, picor',
  'Se me escapa la orina al hacer esfuerzos',
  'Tengo que ir rápido al baño porque si no se me escapa la orina',
  'Mis molestias genitales me limitan mis actividades cotidianas (trabajas, actividades domésticas, aseo, etc)',
  'Noto molestias genitales al caminar o hacer ejercicio',
  'Noto molestias genitales por la noche y me limitan el descanso',
  'Mis molestias genitales condicionan la elección de mi ropa interior',
  'Estoy preocupada por mis molestias genitales',
  'El actual aspecto de mis genitales no me agrada',
  'Los síntomas que noto me hacen sentirme mayor',
  'Mis molestias genitales hacen que disminuya mi deseo sexual',
  'Tengo dolor durante la actividad sexual',
  'Mi vida sexual no es satisfactoria debido a mis síntomas genitales',
  'Siento poca lubricación/sequedad durante la actividad sexual'
];

const visit = 'V4' as TheraVisit;
const baseline = visit === 'V0';
const fullAssessment = ['V0', 'V1', 'V2', 'V4'].includes(visit);
const cervantes = ['V0', 'V2', 'V4'].includes(visit);
const hasDeviceQuestion = visit === 'V0' || visit === 'V1';
const visitTitle = {
  V0: 'Visita basal',
  V1: 'Primera visita',
  V2: 'Segunda visita',
  V3: 'Tercera visita',
  V4: 'Cuarta visita'
}[visit];
const studyDescription =
  'Eficacia de las infiltraciones vaginales de complejos híbridos cooperativos de ácido hialurónico para el tratamiento del síndrome genitourinario de la menopausia en mujeres con antecedentes de cáncer de mama.';
const shape: { [key: string]: z.ZodType<FormInstrument.Data[string]> } = {
  _thera_test_dates: z.boolean().optional(),
  study_visit: z.string().optional(),
  patient_code: requiredText,
  site_hospital: requiredText,
  visit_date: dateSchema
};
const groups: Group[] = [
  {
    title: 'Datos de la visita',
    description:
      'Fechas en formato DD/MM/AAAA. Introduzca una fecha válida dentro del periodo permitido para desbloquear las demás preguntas. La identificación del investigador queda vinculada a la sesión autenticada.',
    fields: {
      patient_code: baseline
        ? text('Código de paciente')
        : { kind: 'string', variant: 'select', label: 'Código de paciente *', options: {} },
      site_hospital: { kind: 'string', variant: 'select', label: 'Hospital *', options: {} },
      visit_date: dateField('Fecha de visita')
    }
  }
];
const active = (data: Values) =>
  !baseline ||
  (data.informed_consent === 'si' &&
    Boolean(theraDateToISO(data.consent_date)) &&
    THERA_INCLUSIONS.every((key) => data[key] === 'si'));
const addGroup = (title: string, fields: Fields, description?: string) =>
  groups.push({ title, fields, ...(description ? { description } : {}) });
const clinical = (field: Field, extraDeps: string[] = [], predicate: (data: Values) => boolean = () => true) =>
  conditional(
    field,
    [...(baseline ? clinicalVisibilityDeps : []), ...extraDeps],
    (data) => active(data) && predicate(data)
  );
const requiredWhen: { deps: string[]; key: string; predicate: (data: Values) => boolean }[] = [];

function addClinical(
  key: string,
  schema: z.ZodType<FormInstrument.Data[string]>,
  field: Field,
  fields: Fields,
  deps: string[] = [],
  predicate: (data: Values) => boolean = () => true
) {
  shape[key] = schema.optional();
  fields[key] = clinical({ ...field, label: requiredLabel(field.label) }, deps, predicate);
  requiredWhen.push({ key, deps, predicate: (data) => active(data) && predicate(data) });
}

if (!baseline) {
  shape.baseline_date = dateSchema;
  groups[0]!.fields.baseline_date = dateField('Fecha basal guardada', true);
  if (visit !== 'V1') {
    shape.first_visit_date = dateSchema;
    groups[0]!.fields.first_visit_date = dateField('Fecha guardada de la primera visita (pauta completa)', true);
  }
}

if (baseline) {
  shape.informed_consent = z.enum(['si', 'no']);
  shape.consent_date = optionalDate;
  addGroup('Consentimiento informado', {
    informed_consent: radio('¿La paciente ha firmado el consentimiento informado?'),
    consent_date: conditional(
      dateField('Fecha de firma del consentimiento'),
      ['informed_consent'],
      (data) => data.informed_consent === 'si'
    )
  });
  const inclusionLabels = [
    'El paciente presenta antecedentes de cáncer de mama hormonodependiente y está libre de enfermedad',
    'El paciente presenta un estado posmenopáusico natural o inducido, definido por criterios STRAW+10',
    'El paciente presenta atrofia vulvovaginal: índice de salud vaginal <15 o dispareunia y/o sequedad vaginal EVA ≥5',
    'El paciente tiene ≥18 años y ha firmado el consentimiento informado'
  ];
  const exclusionLabels = [
    'El paciente presenta una contraindicación o advertencia para el uso de complejos híbridos cooperativos de ácido hialurónico según la IFU (p.ej. inflamación, embarazo, lactancia, alergia)',
    'El paciente presenta lesiones vaginales, cervicales o genitales; sangrado genital no investigado; enfermedad cutánea en la zona a tratar; predisposición a cicatrices hipertróficas o queloides',
    'El paciente presenta trastornos de coagulación o cáncer cervical, de ovario o uterino en el momento de la inclusión',
    'El paciente presenta infección bacteriana, fúngica o vírica vulvovaginal o urinaria, o ha recibido tratamiento para dichas afecciones en el último mes',
    'El paciente ha recibido infiltraciones vaginales de ácido hialurónico, radiofrecuencia, PRP o láser vaginal en el último año',
    'El paciente no puede cumplir los procedimientos, no es candidato adecuado a juicio del investigador o participa en otro estudio relacionado'
  ];
  const consentGate = (field: Field) =>
    conditional(field, ['informed_consent'], (data) => data.informed_consent === 'si');
  const inclusionFields: Fields = {};
  const exclusionFields: Fields = {};
  THERA_INCLUSIONS.forEach((key, index) => {
    shape[key] = z.enum(['si', 'no']).optional();
    inclusionFields[key] = consentGate(radio(`${index + 1}. ${inclusionLabels[index]}`));
  });
  THERA_EXCLUSIONS.forEach((key, index) => {
    shape[key] = z.enum(['si', 'no']).optional();
    exclusionFields[key] = consentGate(radio(`${index + 1}. ${exclusionLabels[index]}`));
  });
  addGroup('Criterios de inclusión (todos deben ser SÍ)', inclusionFields);
  addGroup('Criterios de exclusión (todos deben ser NO)', exclusionFields);
}

{
  const evaFields: Fields = {};
  for (const [key, label] of [
    ['eva_dryness', 'Sequedad vaginal'],
    ['eva_dyspareunia', 'Dispareunia (dolor)']
  ]) {
    shape[key!] = z.number().int().min(0).max(10).optional();
    const field: Field = {
      kind: 'number',
      variant: 'input',
      label: requiredLabel(`${label!} (0–10)`),
      description: 'Introduzca un número entero del 0 al 10. 0 = sin síntomas; 10 = máxima intensidad imaginable.',
      min: 0,
      max: 10
    };
    evaFields[key!] = baseline
      ? conditional(field, ['informed_consent'], (data) => data.informed_consent === 'si')
      : field;
  }
  addGroup(
    'Escala visual análoga para síndrome genitourinario',
    evaFields,
    'Escala del 0 al 10: marque el número que mejor describa la intensidad de la sequedad vaginal y el dolor genital. El 0 significa que no presenta síntomas y el 10 la máxima intensidad imaginable. De forma orientativa: 1-3 = leve, 4-6 = moderado y 7-10 = intenso.'
  );
  if (fullAssessment) {
    const vaginalFields: Fields = {};
    THERA_VAGINAL_ITEMS.forEach((key, index) => {
      shape[key] = z.number().int().min(1).max(5).optional();
      const [label, labels] = vaginalLabels[index]!;
      vaginalFields[key] = baseline
        ? conditional(score(label, optionsFrom(labels)), ['informed_consent'], (data) => data.informed_consent === 'si')
        : score(label, optionsFrom(labels));
    });
    addGroup(
      'Índice de salud vaginal (investigador)',
      vaginalFields,
      'El investigador deberá completar el índice de salud vaginal. Debe seleccionar el valor (1-5) correspondiente para cada uno de los cinco parámetros (elasticidad vaginal, secreciones, pH, integridad de la mucosa e hidratación) según la exploración ginecológica. La puntuación total (5-25) se obtiene sumando los ítems. Valores más bajos indican mayor atrofia vaginal y valores más altos mejor estado vaginal.'
    );
    const fsfiFields: Fields = {};
    fsfiQuestions.forEach((label, index) => {
      const options = index === 0 ? frequency : { sin_actividad: 'Sin actividad sexual', ...frequency };
      addClinical(
        `fsfi_${index + 1}`,
        z.enum(Object.keys(options) as [string, ...string[]]),
        radio(`${index + 1}. ${label}`, options),
        fsfiFields
      );
    });
    addGroup(
      'Función sexual femenina (FSFI-6)',
      fsfiFields,
      'Responda a cada pregunta pensando en su experiencia durante las últimas 4 semanas y marque la opción que mejor la describa. No existen preguntas correctas o incorrectas. Es importante contestar con sinceridad. Si no ha tenido actividad sexual en este periodo, seleccione la opción “Sin actividad sexual” cuando corresponda. Toda la información será tratada de forma confidencial.'
    );
    const vulvarFields: Fields = {};
    THERA_VULVAR_ITEMS.forEach((key, index) => {
      const [label, labels] = vulvarLabels[index]!;
      addClinical(key, z.number().int().min(0).max(3), score(label, optionsFrom(labels, 0)), vulvarFields);
    });
    addGroup(
      'Índice de salud vulvar (investigador)',
      vulvarFields,
      'El investigador deberá completar el índice de salud vulvar. Debe seleccionar la puntuación (0-3) para cada ítem (labios menores y mayores, clítoris, vestíbulo y elasticidad, color, y dolor) según la exploración ginecológica. La suma total indica el grado de afectación. Puntuaciones: 0-5 corresponde a atrofia leve; 5-10 moderada; >10 corresponde a atrofia severa.'
    );
  }
  if (cervantes) {
    const cervantesFields: Fields = {};
    cervantesQuestions.forEach((label, index) => {
      if (index === 11) {
        addClinical(
          'sexual_activity_4_weeks',
          z.enum(['si', 'no']),
          radio('¿Ha tenido actividad sexual en las últimas 4 semanas? (coito, masturbación, caricias, etc.)'),
          cervantesFields
        );
      }
      addClinical(
        `cervantes_${index + 1}`,
        z.number().int().min(1).max(5),
        score(
          `${index + 1}. ${label}`,
          optionsFrom([
            'En total desacuerdo',
            'En desacuerdo',
            'Ni en acuerdo ni en desacuerdo',
            'De acuerdo',
            'Totalmente de acuerdo'
          ])
        ),
        cervantesFields,
        index >= 11 ? ['sexual_activity_4_weeks'] : [],
        index >= 11 ? (data) => data.sexual_activity_4_weeks === 'si' : () => true
      );
    });
    addGroup(
      'Calidad de vida (Escala Cervantes-SGM)',
      cervantesFields,
      'Por favor lea atentamente cada una de las preguntas que vienen a continuación. Este cuestionario le pide que responda según una escala del 1 al 5, donde 1 significa “totalmente en desacuerdo” y 5 “totalmente de acuerdo”, con opciones intermedias. Las preguntas se refieren a posibles síntomas o molestias en la zona genital (vulva y/o vagina) durante las últimas 4 semanas. Algunas preguntas (12 a 15) tratan sobre la actividad sexual (relaciones, caricias o masturbación) y solo debe responderlas si ha tenido actividad sexual. Le pedimos que responda con sinceridad y sin pensarlo demasiado, ya que no hay respuestas correctas o incorrectas. El cuestionario es confidencial. Es importante contestar todas las preguntas que correspondan, ya que si alguna queda en blanco, el cuestionario podría no ser válido.'
    );
  }
  if (visit === 'V3') {
    const fields: Fields = {};
    const options = {
      no_evaluado: 'No evaluado',
      mucho_mejor: 'Mucho mejor',
      poco_mejor: 'Un poco mejor',
      igual: 'Igual',
      poco_peor: 'Un poco peor',
      bastante_peor: 'Bastante peor',
      mucho_peor: 'Mucho peor'
    };
    addClinical(
      'pgi_i',
      z.enum(Object.keys(options) as [string, ...string[]]),
      radio('¿Cómo se ha sentido en general desde que empezó el tratamiento?', options),
      fields
    );
    addGroup('Mejoría global del paciente (PGI-I)', fields);
  }
}

if (baseline) {
  const fields: Fields = {};
  addClinical('age', z.number().int().min(18).max(120), numeric('Edad (años)', 18, 120), fields);
  addClinical('weight', z.number().min(20).max(300), numeric('Peso (kg)', 20, 300), fields);
  addClinical('height', z.number().min(100).max(250), numeric('Altura (cm)', 100, 250), fields);
  const single = (key: string, label: string, options: { [key: string]: string } = yesNo) =>
    addClinical(key, z.enum(Object.keys(options) as [string, ...string[]]), radio(label, options), fields);
  const dependentText = (key: string, label: string, dep: string, value = 'si') =>
    addClinical(key, requiredText, text(label), fields, [dep], (data) => data[dep] === value);
  const multi = (key: string, label: string, options: { [key: string]: string }, dep: string, value = 'si') =>
    addClinical(
      key,
      z.set(z.enum(Object.keys(options) as [string, ...string[]])).min(1),
      { kind: 'set', variant: 'select', label, options },
      fields,
      [dep],
      (data) => data[dep] === value
    );
  const otherText = (key: string, dep: string, parent: string) =>
    addClinical(
      key,
      requiredText,
      text('Otro: especificar'),
      fields,
      [dep, parent],
      (data) => data[parent] === 'si' && data[dep] instanceof Set && data[dep].has('otro')
    );
  const historicalDate = (key: string, label: string, deps: string[], predicate: (data: Values) => boolean) =>
    addClinical(key, dateSchema, dateField(label), fields, deps, predicate);
  single('ethnicity', 'Etnia', { caucasica: 'Caucásica', africana: 'Africana', asiatica: 'Asiática', otra: 'Otra' });
  dependentText('ethnicity_other', 'Otra etnia: especificar', 'ethnicity', 'otra');
  addGroup('Datos sociodemográficos', { ...fields });
  for (const key of Object.keys(fields)) delete fields[key];
  single('menopause_type', '¿Qué tipo de menopausia tuvo?', {
    natural: 'Natural',
    quirurgica: 'Quirúrgica',
    farmacoinducida: 'Farmacoinducida'
  });
  single('childbirth', '¿Ha tenido algún parto?');
  multi(
    'childbirth_types',
    'Tipos de parto (seleccione todos los que correspondan)',
    {
      vaginal_sin: 'Vaginal sin episiotomía',
      vaginal_con: 'Vaginal con episiotomía',
      instrumental: 'Vaginal con fórceps/ventosa',
      cesarea: 'Cesárea'
    },
    'childbirth'
  );
  single('vaginal_surgery', '¿Ha tenido algún tipo de cirugía vaginal?');
  addGroup('Datos gineco-obstétricos', { ...fields });
  for (const key of Object.keys(fields)) delete fields[key];
  historicalDate('breast_cancer_diagnosis_date', 'Fecha del diagnóstico de cáncer de mama', [], () => true);
  single('breast_cancer_surgery', '¿Ha sido intervenida por su cáncer de mama?');
  single('chemotherapy', '¿Ha llevado a cabo tratamiento con quimioterapia?');
  historicalDate(
    'chemotherapy_end_date',
    'Fecha de finalización de quimioterapia',
    ['chemotherapy'],
    (data) => data.chemotherapy === 'si'
  );
  single('hormonal_treatment', '¿Ha llevado a cabo tratamiento hormonal?');
  multi(
    'hormonal_types',
    'Tipo de tratamiento hormonal',
    { tamoxifeno: 'Tamoxifeno', aromatasa: 'Inhibidores de la aromatasa', otro: 'Otro' },
    'hormonal_treatment'
  );
  otherText('hormonal_other', 'hormonal_types', 'hormonal_treatment');
  addClinical(
    'hormonal_ongoing',
    z.enum(['si', 'no']),
    radio('¿Actualmente sigue en tratamiento hormonal?'),
    fields,
    ['hormonal_treatment'],
    (data) => data.hormonal_treatment === 'si'
  );
  historicalDate(
    'hormonal_end_date',
    'Fecha de finalización del tratamiento hormonal',
    ['hormonal_treatment', 'hormonal_ongoing'],
    (data) => data.hormonal_treatment === 'si' && data.hormonal_ongoing === 'no'
  );
  single('pelvic_radiotherapy', '¿Ha recibido radioterapia genital/pélvica?');
  historicalDate(
    'radiotherapy_end_date',
    'Fecha de finalización de radioterapia',
    ['pelvic_radiotherapy'],
    (data) => data.pelvic_radiotherapy === 'si'
  );
  single('other_cancer', '¿Ha tenido algún otro cáncer además del cáncer de mama?');
  multi(
    'other_cancer_types',
    'Indique qué otro cáncer',
    {
      cervical: 'Cáncer de cuello uterino',
      ovario: 'Cáncer de ovario',
      utero: 'Cáncer de endometrio/útero',
      otro: 'Otros'
    },
    'other_cancer'
  );
  otherText('other_cancer_other', 'other_cancer_types', 'other_cancer');
  addGroup('Antecedentes oncológicos', { ...fields });
  for (const key of Object.keys(fields)) delete fields[key];
  historicalDate('genital_symptoms_diagnosis_date', 'Fecha del diagnóstico de los síntomas genitales', [], () => true);
  single(
    'oncology_symptoms_relation',
    '¿Los síntomas genitales están relacionados con el tratamiento oncológico recibido?',
    {
      no: 'No están relacionados',
      inducidos: 'Fueron inducidos por el tratamiento',
      empeorados: 'Empeoraron a consecuencia del tratamiento'
    }
  );
  single(
    'recent_genital_treatment',
    '¿Ha utilizado algún tratamiento para sus síntomas genitales en las últimas 4 semanas?'
  );
  multi(
    'genital_treatment_types',
    'Tipo de tratamiento',
    {
      lubricantes: 'Lubricantes vaginales',
      hidratantes: 'Cremas hidratantes',
      estrogenos: 'Estrógenos locales',
      ospemifeno: 'Ospemifeno',
      prasterona: 'Prasterona',
      otro: 'Otro'
    },
    'recent_genital_treatment'
  );
  otherText('genital_treatment_other', 'genital_treatment_types', 'recent_genital_treatment');
  addGroup('Síndrome genitourinario de la menopausia', { ...fields });
  for (const key of Object.keys(fields)) delete fields[key];
  single('currently_sexually_active', 'Actualmente, ¿es sexualmente activa?');
  addClinical(
    'vaginal_penetration',
    z.enum(['si', 'no']),
    radio('¿En su actividad sexual suele incluir penetración vaginal?'),
    fields,
    ['currently_sexually_active'],
    (data) => data.currently_sexually_active === 'si'
  );
  addGroup('Actividad sexual actual', { ...fields });
}

{
  const fields: Fields = {};
  if (hasDeviceQuestion) {
    addClinical(
      'device_deficiency',
      z.enum(['si', 'no']),
      radio('¿Se ha observado alguna deficiencia del producto?'),
      fields
    );
    addClinical(
      'device_deficiency_description',
      requiredText,
      text('Especifique la deficiencia del producto'),
      fields,
      ['device_deficiency'],
      (data) => data.device_deficiency === 'si'
    );
  }
  addClinical(
    'serious_adverse_event',
    z.enum(['si', 'no']),
    radio('¿Ha presentado algún acontecimiento adverso grave durante el periodo de estudio?'),
    fields
  );
  const eventSchema = z.object({
    onset_date: dateSchema,
    event_type: z.enum(['grave', 'deficiencia', 'ambos']),
    description: requiredText,
    device_problem: requiredText,
    clinical_signs: requiredText,
    action_evolution: requiredText,
    causality: requiredText,
    serious_unexpected_device_effect: z.enum(['si', 'no']),
    status: z.enum(['en_curso', 'resuelto']),
    status_detail: requiredText,
    resolution_date: optionalDate
  });
  const eventField: Field = {
    kind: 'record-array',
    label: 'Acontecimientos adversos graves',
    fieldset: {
      onset_date: dateField('Fecha de inicio'),
      description: { kind: 'string', variant: 'textarea', label: 'Descripción del evento *' },
      device_problem: text('Problema del dispositivo (indique «no aplica» si procede)'),
      clinical_signs: text('Signos y síntomas clínicos (indique «no aplica» si procede)'),
      action_evolution: { kind: 'string', variant: 'textarea', label: 'Acción/tratamiento y evolución clínica *' },
      causality: text('Relación con el dispositivo (causalidad, texto libre)'),
      serious_unexpected_device_effect: radio('¿Efecto adverso grave o imprevisto relacionado con el dispositivo?'),
      status: radio('Estado técnico del evento', { en_curso: 'En curso', resuelto: 'Resuelto' }),
      status_detail: text('Detalle del estado del evento'),
      resolution_date: {
        kind: 'dynamic',
        render: (data) => (data.status === 'resuelto' ? dateField('Fecha de resolución') : null)
      }
    }
  };
  addClinical(
    'adverse_event_records',
    z.array(eventSchema.omit({ event_type: true })).min(1),
    eventField,
    fields,
    ['serious_adverse_event'],
    (data) => data.serious_adverse_event === 'si'
  );
  if (hasDeviceQuestion) {
    addClinical(
      'device_deficiency_records',
      z.array(eventSchema.omit({ event_type: true })).min(1),
      { ...eventField, label: 'Deficiencias del dispositivo' },
      fields,
      ['device_deficiency'],
      (data) => data.device_deficiency === 'si'
    );
  }
  const deviceFields: Fields = {};
  for (const key of ['device_deficiency', 'device_deficiency_description', 'device_deficiency_records']) {
    if (fields[key]) {
      deviceFields[key] = fields[key];
      delete fields[key];
    }
  }
  if (hasDeviceQuestion) addGroup('Deficiencias del dispositivo', deviceFields);
  addGroup('Acontecimientos adversos graves', fields, 'Añada un registro por acontecimiento.');
}

if (hasDeviceQuestion) {
  const fields: Fields = {};
  addClinical('injections_performed', z.enum(['si', 'no']), radio('¿Se realizaron las inyecciones vaginales?'), fields);
  addClinical(
    'injections_not_performed_reason',
    requiredText,
    text('Si no, especifique el motivo'),
    fields,
    ['injections_performed'],
    (data) => data.injections_performed === 'no'
  );
  const injected = (data: Values) => data.injections_performed === 'si';
  addClinical(
    'injection_count',
    z.number().int().min(1),
    numeric('Número total de inyecciones administradas', 1),
    fields,
    ['injections_performed'],
    injected
  );
  addClinical(
    'injection_sites',
    z.set(z.enum(['1', '2', '3', '4', '5', '6', 'otro'])).min(1),
    {
      kind: 'set',
      variant: 'select',
      label: 'Localización de las inyecciones',
      options: { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', otro: 'Otra localización' }
    },
    fields,
    ['injections_performed'],
    injected
  );
  addClinical(
    'injection_site_comment',
    requiredText,
    text('Especifique la otra localización'),
    fields,
    ['injections_performed', 'injection_sites'],
    (data) => injected(data) && data.injection_sites instanceof Set && data.injection_sites.has('otro')
  );
  addClinical(
    'injection_volume_ml',
    z.number().positive(),
    numeric('Volumen total de producto utilizado (mL)', 0),
    fields,
    ['injections_performed'],
    injected
  );
  addGroup(
    'Datos sobre la intervención',
    fields,
    '![Localización numerada de las inyecciones](data:image/png;base64,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)'
  );
}

const sectionOrder = [
  'Datos de la visita',
  'Consentimiento informado',
  'Criterios de inclusión (todos deben ser SÍ)',
  'Criterios de exclusión (todos deben ser NO)',
  'Datos sociodemográficos',
  'Datos gineco-obstétricos',
  'Antecedentes oncológicos',
  'Síndrome genitourinario de la menopausia',
  'Actividad sexual actual',
  'Escala visual análoga para síndrome genitourinario',
  'Índice de salud vaginal (investigador)',
  'Índice de salud vulvar (investigador)',
  'Función sexual femenina (FSFI-6)',
  'Calidad de vida (Escala Cervantes-SGM)',
  'Mejoría global del paciente (PGI-I)',
  'Datos sobre la intervención',
  'Deficiencias del dispositivo',
  'Acontecimientos adversos graves'
];
groups.sort((a, b) => sectionOrder.indexOf(a.title ?? '') - sectionOrder.indexOf(b.title ?? ''));

const cleanInactive = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const clean: Values = { ...value };
  requiredWhen.forEach(({ key, predicate }) => {
    if (!predicate(clean)) delete clean[key];
  });
  if (baseline && clean.informed_consent !== 'si') {
    [
      'consent_date',
      'age',
      ...THERA_INCLUSIONS,
      ...THERA_EXCLUSIONS,
      'eva_dryness',
      'eva_dyspareunia',
      ...THERA_VAGINAL_ITEMS
    ].forEach((key) => delete clean[key]);
  }
  for (const key of ['adverse_event_records', 'device_deficiency_records']) {
    if (!Array.isArray(clean[key])) continue;
    clean[key] = clean[key].map((event: unknown) => {
      if (!event || typeof event !== 'object' || Array.isArray(event)) return event;
      const result: Values = { ...event };
      if (result.status !== 'resuelto') delete result.resolution_date;
      return result;
    });
  }
  delete clean.eligibility_info;
  return clean;
};
const parsedSchema = z
  .preprocess(
    cleanInactive,
    z.object(shape).superRefine((data, ctx) => {
      const visitDate = theraDateToISO(data.visit_date);
      const issue = (key: string, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
      const dateError = theraVisitDateError(visit, data);
      if (dateError) issue('visit_date', dateError);
      const requireValue = (key: string) => {
        if (data[key] === undefined || data[key] === '' || (data[key] instanceof Set && data[key].size === 0))
          issue(key, 'Este campo es obligatorio');
      };
      if (baseline && data.informed_consent === 'no') {
        issue('informed_consent', 'No se puede continuar sin consentimiento informado firmado.');
      }
      if (baseline && data.informed_consent === 'si') {
        [
          'consent_date',
          'age',
          ...THERA_INCLUSIONS,
          ...THERA_EXCLUSIONS,
          'eva_dryness',
          'eva_dyspareunia',
          ...THERA_VAGINAL_ITEMS
        ].forEach(requireValue);
        THERA_INCLUSIONS.forEach((key) => {
          if (data[key] === 'no') issue(key, 'Este criterio de inclusión debe marcarse como "Sí".');
        });
        THERA_EXCLUSIONS.forEach((key) => {
          if (data[key] === 'si') issue(key, 'Este criterio de exclusión debe marcarse como "No".');
        });
        if (visitDate && typeof data.consent_date === 'string' && data.consent_date > visitDate)
          issue('consent_date', 'El consentimiento debe ser anterior o igual a la visita basal');
        if (typeof data.age === 'number' && data.age < 18) {
          issue('age', 'La paciente debe tener al menos 18 años.');
          if (data.inclusion_4 === 'si') issue('inclusion_4', 'La edad registrada es inferior a 18 años');
        }
        const vhi = theraSum(data, THERA_VAGINAL_ITEMS);
        if (
          data.inclusion_3 === 'si' &&
          vhi !== undefined &&
          !(vhi < 15 || Number(data.eva_dryness) >= 5 || Number(data.eva_dyspareunia) >= 5)
        )
          issue('inclusion_3', 'El índice vaginal y las EVA no cumplen este criterio');
      }
      requiredWhen.forEach(({ key, predicate }) => {
        if (predicate(data)) requireValue(key);
      });
      if (data.study_visit !== undefined && data.study_visit !== visit)
        issue('study_visit', 'El tipo de visita no coincide con este instrumento');
      if (!baseline) {
        ['eva_dryness', 'eva_dyspareunia', ...(fullAssessment ? THERA_VAGINAL_ITEMS : [])].forEach(requireValue);
      }
      for (const key of [
        'breast_cancer_diagnosis_date',
        'chemotherapy_end_date',
        'hormonal_end_date',
        'radiotherapy_end_date',
        'genital_symptoms_diagnosis_date'
      ]) {
        const rule = requiredWhen.find((item) => item.key === key);
        if (visitDate && rule?.predicate(data) && typeof data[key] === 'string' && data[key] > visitDate)
          issue(key, 'La fecha no puede ser posterior a la visita');
      }
      for (const key of ['chemotherapy_end_date', 'hormonal_end_date', 'radiotherapy_end_date']) {
        const rule = requiredWhen.find((item) => item.key === key);
        if (
          rule?.predicate(data) &&
          typeof data[key] === 'string' &&
          typeof data.breast_cancer_diagnosis_date === 'string' &&
          data[key] < data.breast_cancer_diagnosis_date
        )
          issue(key, 'La finalización no puede preceder al diagnóstico oncológico');
      }
      if (active(data)) {
        for (const table of ['adverse_event_records', 'device_deficiency_records']) {
          const events = data[table];
          if (!Array.isArray(events)) continue;
          const eventIssue = (index: number, key: string, message: string) =>
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [table, index, key], message });
          events.forEach((event, index) => {
            if (visitDate && typeof event.onset_date === 'string' && event.onset_date > visitDate)
              eventIssue(index, 'onset_date', 'El inicio no puede ser posterior a la visita');
            if (event.status === 'resuelto' && !event.resolution_date)
              eventIssue(index, 'resolution_date', 'Indique la fecha de resolución');
            if (
              typeof event.resolution_date === 'string' &&
              event.status === 'resuelto' &&
              ((typeof event.onset_date === 'string' && event.resolution_date < event.onset_date) ||
                (visitDate !== undefined && event.resolution_date > visitDate))
            )
              eventIssue(index, 'resolution_date', 'La resolución debe estar entre el inicio y la visita');
          });
        }
      }
    })
  )
  .transform((data) => ({ ...data, study_visit: visit, ...(visit === 'V4' ? { completed_study: true } : {}) }));

const validationSchema: z.ZodType<FormInstrument.Data, z.ZodTypeDef, unknown> = z.unknown().transform((value, ctx) => {
  const result = parsedSchema.safeParse(value);
  if (result.success) return result.data;
  const errors = new Map<string, { path: (string | number)[]; messages: Set<string> }>();
  for (const issue of result.error.issues) {
    const key = JSON.stringify(issue.path);
    const error = errors.get(key) ?? { path: issue.path, messages: new Set<string>() };
    error.messages.add(issue.message);
    errors.set(key, error);
  }
  for (const error of errors.values()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: error.path, message: [...error.messages].join(' ') });
  }
  return z.NEVER;
});

for (const group of groups) {
  for (const [key, field] of Object.entries(group.fields)) {
    if (!field || ['patient_code', 'visit_date', 'baseline_date', 'first_visit_date'].includes(key)) continue;
    group.fields[key] = {
      kind: 'dynamic',
      deps: [
        ...new Set(['visit_date', 'baseline_date', 'first_visit_date', ...(field.kind === 'dynamic' ? field.deps : [])])
      ],
      render(data) {
        const rendered = field.kind === 'dynamic' ? field.render(data) : field;
        return rendered
          ? { ...rendered, disabled: Boolean(rendered.disabled || theraVisitDateError(visit, data)) }
          : null;
      }
    };
  }
}

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  internal: { name: THERA_NAMES[visit], edition: 7 },
  tags: ['THERA-SGM-2026', 'CRF', visit],
  clientDetails: {
    estimatedDuration: { V0: 40, V1: 25, V2: 25, V3: 10, V4: 25 }[visit],
    instructions: [
      [
        baseline
          ? 'Complete el formulario con la información disponible en la historia clínica y las respuestas de la paciente. Registre el consentimiento informado y compruebe los criterios de inclusión y exclusión.'
          : 'Complete la visita de seguimiento con la información de la historia clínica, las respuestas de la paciente y la exploración correspondiente.',
        'Complete los campos marcados con asterisco e introduzca las fechas en formato DD/MM/AAAA o selecciónelas en el calendario.',
        'Si no puede completar el formulario en una sola sesión, puede guardarlo como borrador y continuar en otro momento. Revise la información antes de enviarlo.'
      ].join(' ')
    ]
  },
  details: {
    title: `THERA-SGM-2026 · ${visitTitle}`,
    description: studyDescription,
    license: 'FREE-NOS',
    authors: ['Laura Baquedano Mainar']
  },
  content: groups,
  measures: {
    ...(visit === 'V4'
      ? { completed_study: { kind: 'computed', label: 'Estudio completado', value: () => true } }
      : {}),
    ...(fullAssessment
      ? {
          vaginal_health_total: {
            kind: 'computed',
            label: 'Índice de salud vaginal (5-25)',
            value: (data: Values) => theraSum(data, THERA_VAGINAL_ITEMS)
          },
          vulvar_health_total: {
            kind: 'computed',
            label: 'Índice de salud vulvar (0-15), sin categoría',
            value: (data: Values) => theraSum(data, THERA_VULVAR_ITEMS)
          }
        }
      : {}),
    ...(baseline
      ? {
          eligible: {
            kind: 'computed',
            label: 'Apta para seguimiento',
            value: (data: Values) => isTheraEligible(data)
          }
        }
      : {})
  },
  validationSchema
});
