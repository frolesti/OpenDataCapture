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
  return typeof value === 'string' && /^TH-(?:\d{2,}|[A-Z]{2,})-\d{2,}$/.test(value);
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
  if (date > theraToday()) messages.push('La fecha no puede ser futura.');
  if (visit !== 'V0') {
    const reference = theraDateToISO(visit === 'V1' ? data.baseline_date : data.first_visit_date);
    const window = reference ? theraVisitWindow(visit, reference) : undefined;
    if (!window) messages.push('Se requiere una fecha de referencia guardada válida.');
    else if (date < window.min || date > window.max) {
      messages.push(
        `La visita debe realizarse entre ${formatTheraDate(window.min)} y ${formatTheraDate(window.max)}, ambos incluidos.`
      );
    }
    const baseline = theraDateToISO(data.baseline_date);
    if (baseline && date < baseline) messages.push('La visita no puede preceder a la visita basal.');
  }
  return messages.length ? messages.join(' ') : undefined;
}

export function validateTheraVisit(
  visit: TheraVisit,
  data: { [key: string]: unknown },
  records: TheraStoredVisit[],
  editingId?: string
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
  if (!parseTheraDate(visitDate) || typeof visitDate !== 'string' || visitDate > theraToday()) {
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
  const window = theraVisitWindow(visit, String(visit === 'V1' ? baseline.data.visit_date : first?.data.visit_date));
  if (!window) return 'No se puede calcular la ventana de visita.';
  return theraVisitDateError(visit, data);
}
