export const THERA_NAMES = {
  V0: 'THERA_SGM_2026_V0',
  V1: 'THERA_SGM_2026_V1',
  V2: 'THERA_SGM_2026_V2',
  V3: 'THERA_SGM_2026_V3',
  V4: 'THERA_SGM_2026_V4'
} as const;

export type TheraVisit = keyof typeof THERA_NAMES;
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
  const window = theraVisitWindow(visit, String(visit === 'V1' ? baseline.data.visit_date : first?.data.visit_date));
  if (!window || visitDate < window.min || visitDate > window.max) {
    return window
      ? `La visita debe realizarse entre ${window.min} y ${window.max}, ambos incluidos.`
      : 'No se puede calcular la ventana de visita.';
  }
  return undefined;
}
