import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const YES_NO_OPTIONS = {
  si: 'Sí',
  no: 'No'
} as const;

const INCLUSION_KEYS = [
  'inclusion_1',
  'inclusion_2',
  'inclusion_3',
  'inclusion_4',
  'inclusion_5',
  'inclusion_6'
] as const;

const EXCLUSION_KEYS = [
  'exclusion_1',
  'exclusion_2',
  'exclusion_3',
  'exclusion_4',
  'exclusion_5',
  'exclusion_6'
] as const;

type FormData = Record<string, any>;

const DATE_FORMAT_ERROR = 'Formato de fecha inválido. Use DD-MM-AAAA';
const ORION_SELECTION_DATE_MIN = new Date(2026, 11, 1, 0, 0, 0, 0);
const ORION_SELECTION_DATE_MAX = new Date(2027, 11, 31, 23, 59, 59, 999);
const ORION_AGE_MIN = 18;
const ORION_AGE_MAX = 120;
const ORION_WEIGHT_MIN = 30;
const ORION_WEIGHT_MAX = 250;
const ORION_HEIGHT_MIN = 120;
const ORION_HEIGHT_MAX = 230;

const SELECTION_VISIT_DATE_ERROR =
  'La fecha de la visita de selección debe estar entre diciembre de 2026 y diciembre de 2027.';
const CONSENT_SIGNED_DATE_ERROR =
  'La fecha de firma del consentimiento debe estar entre diciembre de 2026 y diciembre de 2027.';
const CONSENT_DATE_ORDER_ERROR =
  'La fecha de firma del consentimiento no puede ser posterior a la visita de selección.';

function parseManualDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

function optionalManualDateSchema() {
  return z
    .any()
    .optional()
    .transform((value, context) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const parsed = parseManualDate(value);
      if (!parsed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: DATE_FORMAT_ERROR });
        return z.NEVER;
      }

      return parsed;
    });
}

function isEligible(data: FormData): boolean {
  if (data.informed_consent !== 'si') {
    return false;
  }

  const inclusionOk = INCLUSION_KEYS.every((key) => data[key] === 'si');
  const exclusionOk = EXCLUSION_KEYS.every((key) => data[key] === 'no');

  return inclusionOk && exclusionOk;
}

function requiresConsent<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent'] as const,
    render(data: FormData): any {
      return data.informed_consent === 'si' ? field : null;
    }
  };
}

function requiresEligibility<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', ...INCLUSION_KEYS, ...EXCLUSION_KEYS] as const,
    render(data: FormData): any {
      return isEligible(data) ? field : null;
    }
  };
}

function requiresEligibilityAndValue<T extends Record<string, any>>(dep: string, value: any, field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', ...INCLUSION_KEYS, ...EXCLUSION_KEYS, dep] as const,
    render(data: FormData): any {
      if (isEligible(data) && data[dep] === value) {
        return field;
      }
      return null;
    }
  };
}

function eligibilityLiveWarningField(
  dep: string,
  label: string,
  isInvalid: (value: unknown) => boolean,
  message: string
): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', ...INCLUSION_KEYS, ...EXCLUSION_KEYS, dep] as const,
    render(data: FormData): any {
      if (!isEligible(data)) {
        return null;
      }

      if (!isInvalid(data[dep])) {
        return null;
      }

      return {
        kind: 'string',
        variant: 'textarea',
        label,
        description: message,
        disabled: true
      };
    }
  };
}

function eq5d5lFields(
  timeframe: 'retrospective' | 'prospective',
  fieldPrefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_'
): Record<string, any> {
  const prefix = fieldPrefix;
  const labelSuffix =
    timeframe === 'retrospective' ? ' (durante tratamiento con pregabalina IR)' : ' (actualmente con pregabalina PR)';

  return {
    [`${prefix}eq5d_mobility`]: requiresEligibility({
      kind: 'string',
      label: `Movilidad${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para caminar',
        '2': 'Tengo problemas leves para caminar',
        '3': 'Tengo problemas moderados para caminar',
        '4': 'Tengo problemas graves para caminar',
        '5': 'No puedo caminar'
      }
    }),
    [`${prefix}eq5d_selfcare`]: requiresEligibility({
      kind: 'string',
      label: `Auto-cuidado${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para lavarme o vestirme',
        '2': 'Tengo problemas leves para lavarme o vestirme',
        '3': 'Tengo problemas moderados para lavarme o vestirme',
        '4': 'Tengo problemas graves para lavarme o vestirme',
        '5': 'No puedo lavarme o vestirme'
      }
    }),
    [`${prefix}eq5d_activities`]: requiresEligibility({
      kind: 'string',
      label: `Actividades cotidianas(Ej.: trabajar, estudiar, hacer tareas domésticas, actividades familiares o actividades durante el tiempo libre)}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para realizar mis actividades cotidianas',
        '2': 'Tengo problemas leves para realizar mis actividades cotidianas',
        '3': 'Tengo problemas moderados para realizar mis actividades cotidianas',
        '4': 'Tengo problemas graves para realizar mis actividades cotidianas',
        '5': 'No puedo realizar mis actividades cotidianas'
      }
    }),
    [`${prefix}eq5d_pain`]: requiresEligibility({
      kind: 'string',
      label: `Dolor/Malestar${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo dolor ni malestar',
        '2': 'Tengo dolor o malestar leve',
        '3': 'Tengo dolor o malestar moderado',
        '4': 'Tengo dolor o malestar fuerte',
        '5': 'Tengo dolor o malestar extremo'
      }
    }),
    [`${prefix}eq5d_anxiety`]: requiresEligibility({
      kind: 'string',
      label: `Ansiedad/Depresión${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'No estoy ansioso ni deprimido',
        '2': 'Estoy levemente ansioso o deprimido',
        '3': 'Estoy moderadamente ansioso o deprimido',
        '4': 'Estoy muy ansioso o deprimido',
        '5': 'Estoy extremadamente ansioso o deprimido'
      }
    }),
    [`${prefix}eq5d_vas`]: requiresEligibility({
      kind: 'string',
      variant: 'input',
      label: `¿Cómo considera su estado de salud hoy en una escala de 0 a 100?${labelSuffix}`,
      placeholder: 'Su salud hoy',
      description:
        'Donde 100 es la mejor salud que pueda imaginar y 0 la peor. Indique a continuación el número que mejor refleje su estado de salud actual.'
    })
  };
}

function sleepQualityFields(
  timeframe: 'retrospective' | 'prospective',
  fieldPrefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_'
): Record<string, any> {
  const prefix = fieldPrefix;
  const labelSuffix = timeframe === 'retrospective' ? ' (durante pregabalina IR)' : ' (actualmente con pregabalina PR)';

  return {
    [`${prefix}sleep_onset`]: requiresEligibility({
      kind: 'string',
      label: `¿Tenía dificultad para quedarse dormido al acostarse?${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    }),
    [`${prefix}sleep_maintenance`]: requiresEligibility({
      kind: 'string',
      label: `¿Tenía dificultad para mantener el sueño durante la noche?${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    }),
    [`${prefix}sleep_quality`]: requiresEligibility({
      kind: 'string',
      label: `¿Cómo valoraría la calidad global de su sueño?${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'Muy buena',
        '2': 'Buena',
        '3': 'Regular',
        '4': 'Mala',
        '5': 'Muy mala'
      }
    }),
    [`${prefix}sleep_daytime`]: requiresEligibility({
      kind: 'string',
      label: `¿Tiene somnolencia diurna?${labelSuffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    })
  };
}

function adherenceFields(
  timeframe: 'retrospective' | 'prospective',
  fieldPrefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_'
): Record<string, any> {
  const prefix = fieldPrefix;

  return {
    [`${prefix}mmas_forget`]: requiresEligibility({
      kind: 'string',
      label: '¿Alguna vez olvida tomar su medicación?',
      variant: 'radio',
      options: YES_NO_OPTIONS
    }),
    [`${prefix}mmas_remember`]: requiresEligibility({
      kind: 'string',
      label: '¿Alguna vez tiene problemas para recordar tomar su medicación?',
      variant: 'radio',
      options: YES_NO_OPTIONS
    }),
    [`${prefix}mmas_better`]: requiresEligibility({
      kind: 'string',
      label: 'Cuando se siente mejor, ¿a veces deja de tomar su medicación?',
      variant: 'radio',
      options: YES_NO_OPTIONS
    }),
    [`${prefix}mmas_worse`]: requiresEligibility({
      kind: 'string',
      label: 'A veces, si se siente peor cuando toma su medicación, ¿deja de tomarla?',
      variant: 'radio',
      options: YES_NO_OPTIONS
    })
  };
}

function dateField(label: string, description = 'Formato: DD-MM-AAAA'): Record<string, any> {
  return {
    kind: 'string',
    variant: 'input',
    label,
    placeholder: 'DD-MM-AAAA',
    description
  };
}

function nonPersistentCheckboxSchema() {
  return z
    .boolean()
    .optional()
    .transform(() => undefined);
}

function isTreatmentComplete(data: FormData, prefix: string, treatmentNumber: number): boolean {
  return Boolean(
    data[`${prefix}_treatment_name_${treatmentNumber}`] &&
      data[`${prefix}_treatment_dose_mg_${treatmentNumber}`] !== undefined &&
      data[`${prefix}_treatment_start_${treatmentNumber}`] &&
      data[`${prefix}_treatment_end_${treatmentNumber}`]
  );
}

function treatmentCheckboxLabel(treatmentNumber: number): string {
  const ordinal = ['segundo', 'tercer', 'cuarto'][treatmentNumber - 2];
  return `¿Desea añadir un ${ordinal} tratamiento?`;
}

function showAddTreatmentCheckbox(prefix: 'prev' | 'current' | 'concomitant', treatmentNumber: number): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      ...INCLUSION_KEYS,
      ...EXCLUSION_KEYS,
      `${prefix}_treatment_name_${treatmentNumber}`,
      `${prefix}_treatment_dose_mg_${treatmentNumber}`,
      `${prefix}_treatment_start_${treatmentNumber}`,
      `${prefix}_treatment_end_${treatmentNumber}`
    ] as const,
    render(data: FormData): any {
      if (!isEligible(data) || !isTreatmentComplete(data, prefix, treatmentNumber)) {
        return null;
      }
      return {
        kind: 'boolean',
        variant: 'checkbox',
        label: treatmentCheckboxLabel(treatmentNumber + 1)
      };
    }
  };
}

function requiresPreviousTreatment<T extends Record<string, any>>(
  field: T,
  prefix: 'prev' | 'current' | 'concomitant',
  treatmentNumber: number
): any {
  if (treatmentNumber === 1) {
    return requiresEligibility(field);
  }

  const previousTreatment = treatmentNumber - 1;
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      ...INCLUSION_KEYS,
      ...EXCLUSION_KEYS,
      `${prefix}_treatment_name_${previousTreatment}`,
      `${prefix}_treatment_dose_mg_${previousTreatment}`,
      `${prefix}_treatment_start_${previousTreatment}`,
      `${prefix}_treatment_end_${previousTreatment}`,
      `add_${prefix}_treatment_${treatmentNumber}`
    ] as const,
    render(data: FormData): any {
      return isEligible(data) &&
        isTreatmentComplete(data, prefix, previousTreatment) &&
        data[`add_${prefix}_treatment_${treatmentNumber}`] === true
        ? field
        : null;
    }
  };
}

function generateTreatmentFields(prefix: 'prev' | 'current' | 'concomitant', maxTreatments = 4): Record<string, any> {
  const fields: Record<string, any> = {};

  for (let i = 1; i <= maxTreatments; i++) {
    fields[`${prefix}_treatment_name_${i}`] = requiresPreviousTreatment(
      {
        kind: 'string',
        variant: 'input',
        label: `Tratamiento ${i}`
      },
      prefix,
      i
    );

    fields[`${prefix}_treatment_dose_mg_${i}`] = requiresPreviousTreatment(
      {
        kind: 'number',
        variant: 'input',
        label: `Dosis (mg) - Tratamiento ${i}`
      },
      prefix,
      i
    );

    fields[`${prefix}_treatment_start_${i}`] = requiresPreviousTreatment(
      dateField(`Fecha de inicio - Tratamiento ${i}`),
      prefix,
      i
    );

    fields[`${prefix}_treatment_end_${i}`] = requiresPreviousTreatment(
      dateField(`Fecha de fin - Tratamiento ${i}`),
      prefix,
      i
    );

    if (i < maxTreatments) {
      fields[`add_${prefix}_treatment_${i + 1}`] = showAddTreatmentCheckbox(prefix, i);
    }
  }

  return fields;
}

function treatmentValidation(prefix: 'prev' | 'current' | 'concomitant', maxTreatments = 4): Record<string, any> {
  const schema: Record<string, any> = {};

  for (let i = 1; i <= maxTreatments; i++) {
    schema[`${prefix}_treatment_name_${i}`] = z.string().optional();
    schema[`${prefix}_treatment_dose_mg_${i}`] = z.number().optional();
    schema[`${prefix}_treatment_start_${i}`] = optionalManualDateSchema();
    schema[`${prefix}_treatment_end_${i}`] = optionalManualDateSchema();
    if (i < maxTreatments) {
      schema[`add_${prefix}_treatment_${i + 1}`] = nonPersistentCheckboxSchema();
    }
  }

  return schema;
}

function getTime(value: unknown): number | undefined {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

function isComorbidityComplete(data: FormData, number: number): boolean {
  return Boolean(data[`comorbidity_${number}`] && data[`comorbidity_${number}_diagnosis_date`]);
}

function generateComorbidityFields(maxComorbidities = 4): Record<string, any> {
  const fields: Record<string, any> = {};

  for (let i = 1; i <= maxComorbidities; i++) {
    const previous = i - 1;
    const showField = <T extends Record<string, any>>(field: T): any => {
      if (i === 1) {
        return requiresEligibility(field);
      }
      return {
        kind: 'dynamic' as const,
        deps: [
          'informed_consent',
          ...INCLUSION_KEYS,
          ...EXCLUSION_KEYS,
          `comorbidity_${previous}`,
          `comorbidity_${previous}_diagnosis_date`,
          `add_comorbidity_${i}`
        ] as const,
        render(data: FormData): any {
          return isEligible(data) && isComorbidityComplete(data, previous) && data[`add_comorbidity_${i}`] === true
            ? field
            : null;
        }
      };
    };

    fields[`comorbidity_${i}`] = showField({ kind: 'string', variant: 'input', label: `Comorbilidad ${i}` });
    fields[`comorbidity_${i}_diagnosis_date`] = showField(dateField(`Fecha de diagnóstico - Comorbilidad ${i}`));

    if (i < maxComorbidities) {
      fields[`add_comorbidity_${i + 1}`] = {
        kind: 'dynamic' as const,
        deps: [
          'informed_consent',
          ...INCLUSION_KEYS,
          ...EXCLUSION_KEYS,
          `comorbidity_${i}`,
          `comorbidity_${i}_diagnosis_date`
        ] as const,
        render(data: FormData): any {
          return isEligible(data) && isComorbidityComplete(data, i)
            ? { kind: 'boolean', variant: 'checkbox', label: `¿Desea añadir una comorbilidad ${i + 1}?` }
            : null;
        }
      };
    }
  }

  return fields;
}

function comorbidityValidation(maxComorbidities = 4): Record<string, any> {
  const schema: Record<string, any> = {};
  for (let i = 1; i <= maxComorbidities; i++) {
    schema[`comorbidity_${i}`] = z.string().optional();
    schema[`comorbidity_${i}_diagnosis_date`] = optionalManualDateSchema();
    if (i < maxComorbidities) {
      schema[`add_comorbidity_${i + 1}`] = nonPersistentCheckboxSchema();
    }
  }
  return schema;
}

const PHARMACOVIGILANCE_INSTRUCTION =
  'Si la reacción adversa cumple los criterios de registro sistemático del protocolo (grave o de especial interés), cumplimente el registro de reacciones adversas, rellene el formulario de notificación y envíelo a farmacovigilancia@gebro.es en menos de 24 horas. Para cualquier otra reacción adversa, notifíquela al Sistema Español de Farmacovigilancia siguiendo su práctica clínica habitual.';

function pharmacovigilanceInstruction(eventKey: string): any {
  return requiresEligibilityAndValue(eventKey, 'si', {
    kind: 'string',
    variant: 'textarea',
    label: 'Instrucciones de farmacovigilancia',
    description: PHARMACOVIGILANCE_INSTRUCTION,
    disabled: true
  });
}

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Neuropathic Pain', 'Primary Care'],
  internal: {
    edition: 1,
    name: 'ORION_PR_2026_SELECTION'
  },
  content: [
    {
      title: 'CÓDIGO DEL USUARIO',
      fields: {
        user_code: {
          kind: 'string',
          variant: 'input',
          label: 'Código del usuario *'
        }
      }
    },
    {
      title: 'CONSENTIMIENTO INFORMADO',
      fields: {
        informed_consent: {
          kind: 'string',
          label: '¿El paciente ha firmado el consentimiento informado? *',
          variant: 'radio',
          options: YES_NO_OPTIONS
        },
        selection_visit_date: requiresConsent({
          ...dateField('Fecha de la visita de selección *', 'Fecha permitida: del 01-12-2026 al 31-12-2027.')
        }),
        consent_signed_date: requiresConsent({
          ...dateField(
            'Fecha de firma del consentimiento informado *',
            'Fecha permitida: del 01-12-2026 al 31-12-2027 y no posterior a la visita de selección.'
          )
        })
      }
    },
    {
      title: 'CRITERIOS DE INCLUSIÓN',
      description: 'Todos los criterios de inclusión deben ser SI para que el participante sea apto para el estudio',
      fields: {
        inclusion_1: requiresConsent({
          kind: 'string',
          label:
            '1. El paciente tiene diagnóstico de dolor neuropático (periférico o central) documentado en su historia clínica',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_2: requiresConsent({
          kind: 'string',
          label:
            '2. El paciente está previamente tratado con pregabalina de liberación inmediata (IR) antes de iniciar tratamiento con pregabalina de liberación prolongada (PR)',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_3: requiresConsent({
          kind: 'string',
          label: '3. El paciente ha estado en tratamiento con pregabalina PR durante al menos 3 meses y hasta 6 meses',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_4: requiresConsent({
          kind: 'string',
          label:
            '4. El paciente ha recibido pregabalina PR durante al menos el último mes a una dosis terapéutica (165-660 mg), aunque el tratamiento puede haber comenzado con dosis inferiores en la práctica clínica habitual antes de la titulación a 165 mg o superior',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_5: requiresConsent({
          kind: 'string',
          label: '5. El paciente es ≥ 18 años en el momento de la inclusión',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_6: requiresConsent({
          kind: 'string',
          label: '6. El paciente ha proporcionado consentimiento informado por escrito',
          variant: 'radio',
          options: YES_NO_OPTIONS
        })
      }
    },
    {
      title: 'CRITERIOS DE EXCLUSIÓN',
      description: 'Todos los criterios de exclusión deben ser NO para que el participante sea apto para el estudio',
      fields: {
        exclusion_1: requiresConsent({
          kind: 'string',
          label: '1. Pacientes tratados previamente con pregabalina PR antes del curso actual de tratamiento',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        exclusion_2: requiresConsent({
          kind: 'string',
          label:
            '2. Uso de pregabalina PR fuera de la ficha técnica aprobada localmente, incluyendo indicación de administración',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        exclusion_3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes que no puedan cumplir con los requisitos del estudio o que, a criterio del investigador, no deban participar en el estudio',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        exclusion_4: requiresConsent({
          kind: 'string',
          label:
            '4. Pacientes con cualquier contraindicación a pregabalina PR según se especifica en la ficha técnica del producto',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        exclusion_5: requiresConsent({
          kind: 'string',
          label:
            '5. Cualquier situación clínica en la que el investigador considere que el tratamiento no es seguro (por ejemplo, enfermedad psiquiátrica grave no controlada, depresión, ideación suicida activa, alto riesgo de incumplimiento terapéutico)',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        exclusion_6: requiresConsent({
          kind: 'string',
          label:
            '6. Participación en otro estudio clínico o de investigación que pueda interferir con la interpretación de los datos',
          variant: 'radio',
          options: YES_NO_OPTIONS
        })
      }
    },
    {
      title: 'CENTRO DE ATENCIÓN PRIMARIA',
      fields: {
        site_hospital: requiresConsent({
          kind: 'string',
          label: '¿Cuál es el centro de atención primaria donde se visita el paciente?',
          variant: 'select',
          options: (globalThis as any).__ODC_GROUP_HOSPITAL_OPTIONS__ ?? {}
        })
      }
    },
    {
      title: 'DATOS SOCIODEMOGRÁFICOS',
      fields: {
        age: requiresEligibility({
          kind: 'number',
          variant: 'input',
          label: 'Edad (años) *',
          description: `Solo se admiten pacientes adultos (${ORION_AGE_MIN}-${ORION_AGE_MAX} años).`
        }),
        sex: requiresEligibility({
          kind: 'string',
          label: 'Sexo *',
          variant: 'radio',
          options: {
            femenino: 'Femenino',
            masculino: 'Masculino'
          }
        }),
        weight: requiresEligibility({
          kind: 'number',
          variant: 'input',
          label: 'Peso (kg)',
          description: `Rango razonable esperado: ${ORION_WEIGHT_MIN}-${ORION_WEIGHT_MAX} kg.`
        }),
        height: requiresEligibility({
          kind: 'number',
          variant: 'input',
          label: 'Altura (cm)',
          description: `Rango razonable esperado: ${ORION_HEIGHT_MIN}-${ORION_HEIGHT_MAX} cm.`
        }),
        age_live_warning: eligibilityLiveWarningField(
          'age',
          'Aviso de edad',
          (value) => typeof value === 'number' && (value < ORION_AGE_MIN || value > ORION_AGE_MAX),
          `La edad indicada no es válida para este estudio. Debe estar entre ${ORION_AGE_MIN} y ${ORION_AGE_MAX} años.`
        ),
        weight_live_warning: eligibilityLiveWarningField(
          'weight',
          'Aviso de peso',
          (value) => typeof value === 'number' && (value < ORION_WEIGHT_MIN || value > ORION_WEIGHT_MAX),
          `El peso indicado está fuera del rango razonable (${ORION_WEIGHT_MIN}-${ORION_WEIGHT_MAX} kg). Revise el dato antes de continuar.`
        ),
        height_live_warning: eligibilityLiveWarningField(
          'height',
          'Aviso de altura',
          (value) => typeof value === 'number' && (value < ORION_HEIGHT_MIN || value > ORION_HEIGHT_MAX),
          `La altura indicada está fuera del rango razonable (${ORION_HEIGHT_MIN}-${ORION_HEIGHT_MAX} cm). Revise el dato antes de continuar.`
        )
      }
    },
    {
      title: 'DOLOR NEUROPÁTICO',
      description: 'Clasificación etiológica y anatómica del dolor neuropático',
      fields: {
        neuropathy_etiology: requiresEligibility({
          kind: 'string',
          label: 'Diagnóstico etiológico central y periférico *',
          variant: 'select',
          options: {
            spinal_injury: 'Dolor neuropático relacionado con lesión medular',
            post_stroke: 'Dolor neuropático central post ictus',
            ms_associated: 'Dolor central neuropático asociado a esclerosis múltiple',
            trigeminal_neuralgia: 'Neuralgia del trigémino',
            postherpetic: 'Neuralgia postherpética',
            diabetic: 'Neuropatía diabética',
            nerve_injury: 'Dolor neuropático asociado a lesión de nervio periférico',
            post_amputation: 'Dolor neuropático post amputación',
            polyneuropathy: 'Dolor neuropático asociado a polineuropatía',
            radiculopathy: 'Dolor neuropático asociado a radiculopatía',
            hiv_associated: 'Dolor neuropático asociado a VIH',
            other: 'Otro'
          }
        }),
        neuropathy_etiology_other: requiresEligibilityAndValue('neuropathy_etiology', 'other', {
          kind: 'string',
          label: 'Especifique otro diagnóstico',
          variant: 'textarea'
        }),
        neuropathy_location: requiresEligibility({
          kind: 'string',
          label: 'Clasificación anatómica *',
          variant: 'radio',
          options: {
            central: 'Central',
            peripheral: 'Periférico'
          }
        }),
        diagnosis_date: requiresEligibility({
          ...dateField('Fecha diagnóstico *')
        })
      }
    },
    {
      title: 'TRATAMIENTOS PREVIOS PARA EL DOLOR NEUROPÁTICO (Debe incluir la PREGABALINA IR)',
      fields: {
        ...generateTreatmentFields('prev')
      }
    },
    {
      title: 'TRATAMIENTOS ACTUALES PARA EL DOLOR NEUROPÁTICO (Debe incluir la PREGABALINA PR)',
      fields: {
        ...generateTreatmentFields('current')
      }
    },
    {
      title: 'MOTIVOS PARA EL CAMBIO DE PREGABALINA DE LIBERACIÓN INMEDIATA A PREGABALINA DE LIBERACIÓN PROLONGADA',
      description: 'Puede seleccionar una o varias opciones, según corresponda',
      fields: {
        change_reason_adherence: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Falta de adherencia'
        }),
        change_reason_efficacy: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Falta de eficacia'
        }),
        change_reason_tolerability: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Falta de tolerabilidad'
        }),
        change_reason_patient_pref: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Preferencia del paciente'
        }),
        change_reason_investigator_pref: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Preferencia del investigador'
        }),
        change_reason_other_checked: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label: 'Otros (Especificar)'
        }),
        change_reason_other: requiresEligibilityAndValue('change_reason_other_checked', true, {
          kind: 'string',
          label: 'Especifique otro motivo',
          variant: 'textarea'
        })
      }
    },
    {
      title: 'OTROS TRATAMIENTOS CONCOMITANTES DE INTERÉS (ACTUALES)',
      fields: {
        ...generateTreatmentFields('concomitant')
      }
    },
    {
      title: 'COMORBILIDADES DE INTERÉS',
      fields: {
        ...generateComorbidityFields()
      }
    },
    {
      title: 'EVALUACIÓN RETROSPECTIVA DE LAS ESCALAS - CALIDAD DE VIDA (CUESTIONARIO EQ-5D-5L)',
      description: 'Referidas al periodo en el que el paciente se encontraba en tratamiento con PREGABALINA IR',
      fields: {
        ...eq5d5lFields('retrospective')
      }
    },
    {
      title: 'CALIDAD DE SUEÑO',
      description: 'Durante el tratamiento con pregabalina IR',
      fields: {
        ...sleepQualityFields('retrospective')
      }
    },
    {
      title: 'ADHERENCIA AL TRATAMIENTO (ESCALA MMAS-4)',
      fields: {
        ...adherenceFields('retrospective')
      }
    },
    {
      title: 'EVALUACIÓN PROSPECTIVA DE LAS ESCALAS - CALIDAD DE VIDA (CUESTIONARIO EQ-5D-5L)',
      description: 'Referidas al MOMENTO ACTUAL, cuando están tratados con PREGABALINA PR',
      fields: {
        ...eq5d5lFields('prospective')
      }
    },
    {
      title: 'CALIDAD DE SUEÑO',
      description: 'Actualmente, durante el tratamiento con pregabalina PR',
      fields: {
        ...sleepQualityFields('prospective')
      }
    },
    {
      title: 'MEJORÍA CLÍNICA (ESCALA CGI-I)',
      description:
        'Califique la mejoría global, independientemente de si, según su juicio clínico, se debe por completo al tratamiento farmacológico. En comparación con su estado basal, ¿cuánto ha cambiado?',
      fields: {
        cgi_improvement: requiresEligibility({
          kind: 'string',
          label: 'Mejoría clínica (Escala CGI-I) - Cambio respecto a estado basal',
          variant: 'radio',
          options: {
            '1': 'No evaluado',
            '2': 'Mucho mejor',
            '3': 'Bastante mejor',
            '4': 'Ligeramente mejor',
            '5': 'Sin cambios',
            '6': 'Ligeramente peor',
            '7': 'Bastante peor',
            '8': 'Mucho peor'
          }
        }),
        baseline_adverse_events: requiresEligibility({
          kind: 'string',
          label: '¿Ha presentado algún acontecimiento adverso durante el tratamiento con pregabalina PR?',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        _baseline_pharmacovigilance_instruction: pharmacovigilanceInstruction('baseline_adverse_events')
      }
    },
    {
      title: 'FIRMA DEL PROFESIONAL SANITARIO QUE HA RELLENADO LOS DATOS',
      fields: {
        professional_attestation: requiresEligibility({
          kind: 'boolean',
          variant: 'checkbox',
          label:
            'Confirmo que he revisado y validado la información clínica registrada en este formulario conforme a la historia clínica del paciente *'
        })
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 20,
    instructions: [
      'Complete el instrumento utilizando los datos clínicos disponibles en la historia médica.',
      'Los campos marcados con * son obligatorios.'
    ]
  },
  details: {
    title: 'ORION-PR-2026 - Visita de selección',
    description:
      'Estudio longitudinal, observacional, ambispectivo y multicéntrico para evaluar los cambios en la calidad de vida de pacientes con dolor neuropático tratados con pregabalina de liberación prolongada.',
    license: 'Apache-2.0',
    authors: ['Antonio Alcántara', 'Ana Navarro']
  },
  measures: {},
  validationSchema: z
    .object({
      user_code: z.string().min(1, 'El código del usuario es obligatorio'),
      site_hospital: z.string().optional(),
      informed_consent: z.enum(['si', 'no']),
      selection_visit_date: optionalManualDateSchema(),
      consent_signed_date: optionalManualDateSchema(),

      inclusion_1: z.enum(['si', 'no']).optional(),
      inclusion_2: z.enum(['si', 'no']).optional(),
      inclusion_3: z.enum(['si', 'no']).optional(),
      inclusion_4: z.enum(['si', 'no']).optional(),
      inclusion_5: z.enum(['si', 'no']).optional(),
      inclusion_6: z.enum(['si', 'no']).optional(),

      exclusion_1: z.enum(['si', 'no']).optional(),
      exclusion_2: z.enum(['si', 'no']).optional(),
      exclusion_3: z.enum(['si', 'no']).optional(),
      exclusion_4: z.enum(['si', 'no']).optional(),
      exclusion_5: z.enum(['si', 'no']).optional(),
      exclusion_6: z.enum(['si', 'no']).optional(),

      age: z.number().optional(),
      sex: z.enum(['femenino', 'masculino']).optional(),
      weight: z.number().optional(),
      height: z.number().optional(),

      neuropathy_etiology: z.string().optional(),
      neuropathy_etiology_other: z.string().optional(),
      neuropathy_location: z.enum(['central', 'peripheral']).optional(),
      diagnosis_date: optionalManualDateSchema(),

      ...treatmentValidation('prev'),
      ...treatmentValidation('current'),
      ...treatmentValidation('concomitant'),

      change_reason_adherence: z.boolean().optional(),
      change_reason_efficacy: z.boolean().optional(),
      change_reason_tolerability: z.boolean().optional(),
      change_reason_patient_pref: z.boolean().optional(),
      change_reason_investigator_pref: z.boolean().optional(),
      change_reason_other_checked: z.boolean().optional(),
      change_reason_other: z.string().optional(),

      ...comorbidityValidation(),

      retro_eq5d_mobility: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_eq5d_selfcare: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_eq5d_activities: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_eq5d_pain: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_eq5d_anxiety: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_eq5d_vas: z.coerce.number().min(0).max(100).optional(),
      retro_sleep_onset: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_sleep_maintenance: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_sleep_quality: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_sleep_daytime: z.enum(['1', '2', '3', '4', '5']).optional(),
      retro_mmas_forget: z.enum(['si', 'no']).optional(),
      retro_mmas_remember: z.enum(['si', 'no']).optional(),
      retro_mmas_better: z.enum(['si', 'no']).optional(),
      retro_mmas_worse: z.enum(['si', 'no']).optional(),

      prosp_eq5d_mobility: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_eq5d_selfcare: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_eq5d_activities: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_eq5d_pain: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_eq5d_anxiety: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_eq5d_vas: z.coerce.number().min(0).max(100).optional(),
      prosp_sleep_onset: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_sleep_maintenance: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_sleep_quality: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_sleep_daytime: z.enum(['1', '2', '3', '4', '5']).optional(),
      prosp_mmas_forget: z.enum(['si', 'no']).optional(),
      prosp_mmas_remember: z.enum(['si', 'no']).optional(),
      prosp_mmas_better: z.enum(['si', 'no']).optional(),
      prosp_mmas_worse: z.enum(['si', 'no']).optional(),

      followup_eq5d_mobility: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_eq5d_selfcare: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_eq5d_activities: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_eq5d_pain: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_eq5d_anxiety: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_eq5d_vas: z.coerce.number().min(0).max(100).optional(),
      followup_sleep_onset: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_sleep_maintenance: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_sleep_quality: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_sleep_daytime: z.enum(['1', '2', '3', '4', '5']).optional(),
      followup_mmas_forget: z.enum(['si', 'no']).optional(),
      followup_mmas_remember: z.enum(['si', 'no']).optional(),
      followup_mmas_better: z.enum(['si', 'no']).optional(),
      followup_mmas_worse: z.enum(['si', 'no']).optional(),

      cgi_improvement: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),
      followup_cgi_improvement: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),

      followup_date: optionalManualDateSchema(),
      objective_achieved: z.enum(['si', 'no']).optional(),
      dose_change: z.enum(['si', 'no']).optional(),
      dose_change_date: optionalManualDateSchema(),
      new_dose: z.number().optional(),

      baseline_adverse_events: z.enum(['si', 'no']).optional(),
      _baseline_pharmacovigilance_instruction: z.any().optional(),

      end_date: optionalManualDateSchema(),
      study_completed: z.enum(['si', 'no']).optional(),
      reason_not_completed: z.enum(['investigator', 'patient', 'other']).optional(),
      reason_not_completed_other: z.string().optional(),

      professional_attestation: z.boolean().optional()
    })
    .superRefine((data, context) => {
      const values = data as FormData;

      const addRequiredIssue = (field: string) => {
        const value = values[field];
        if (value === undefined || value === null || value === '') {
          context.addIssue({ code: z.ZodIssueCode.custom, message: 'Este campo es obligatorio', path: [field] });
        }
      };

      if (data.informed_consent === 'si') {
        for (const field of [...INCLUSION_KEYS, ...EXCLUSION_KEYS]) {
          addRequiredIssue(field);
        }
        addRequiredIssue('selection_visit_date');
        addRequiredIssue('consent_signed_date');
      } else {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se puede continuar sin consentimiento informado firmado.',
          path: ['informed_consent']
        });
      }

      if (data.informed_consent === 'si' && !isEligible(values)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'No se puede continuar: revise los criterios de inclusión y exclusión (todos los criterios de inclusión deben ser SI y los de exclusión NO).',
          path: ['inclusion_1']
        });
      }

      const selectionVisitDate = values.selection_visit_date;
      const consentSignedDate = values.consent_signed_date;
      const minTime = ORION_SELECTION_DATE_MIN.getTime();
      const maxTime = ORION_SELECTION_DATE_MAX.getTime();

      if (selectionVisitDate instanceof Date) {
        const visitTime = selectionVisitDate.getTime();
        if (visitTime < minTime || visitTime > maxTime) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: SELECTION_VISIT_DATE_ERROR,
            path: ['selection_visit_date']
          });
        }
      }

      if (consentSignedDate instanceof Date) {
        const consentTime = consentSignedDate.getTime();
        if (consentTime < minTime || consentTime > maxTime) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: CONSENT_SIGNED_DATE_ERROR,
            path: ['consent_signed_date']
          });
        }
      }

      if (selectionVisitDate instanceof Date && consentSignedDate instanceof Date) {
        if (consentSignedDate.getTime() > selectionVisitDate.getTime()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: CONSENT_DATE_ORDER_ERROR,
            path: ['consent_signed_date']
          });
        }
      }

      if (data.informed_consent === 'si' && isEligible(values)) {
        for (const field of [
          'site_hospital',
          'age',
          'sex',
          'neuropathy_etiology',
          'neuropathy_location',
          'diagnosis_date',
          'retro_eq5d_mobility',
          'retro_eq5d_selfcare',
          'retro_eq5d_activities',
          'retro_eq5d_pain',
          'retro_eq5d_anxiety',
          'retro_eq5d_vas',
          'retro_sleep_onset',
          'retro_sleep_maintenance',
          'retro_sleep_quality',
          'retro_sleep_daytime',
          'retro_mmas_forget',
          'retro_mmas_remember',
          'retro_mmas_better',
          'retro_mmas_worse',
          'prosp_eq5d_mobility',
          'prosp_eq5d_selfcare',
          'prosp_eq5d_activities',
          'prosp_eq5d_pain',
          'prosp_eq5d_anxiety',
          'prosp_eq5d_vas',
          'prosp_sleep_onset',
          'prosp_sleep_maintenance',
          'prosp_sleep_quality',
          'prosp_sleep_daytime',
          'cgi_improvement',
          'baseline_adverse_events'
        ]) {
          addRequiredIssue(field);
        }

        if (typeof data.age === 'number' && (data.age < ORION_AGE_MIN || data.age > ORION_AGE_MAX)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `No se puede continuar: la edad debe estar entre ${ORION_AGE_MIN} y ${ORION_AGE_MAX} años.`,
            path: ['age']
          });
        }

        if (typeof data.weight === 'number' && (data.weight < ORION_WEIGHT_MIN || data.weight > ORION_WEIGHT_MAX)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El peso debe estar entre ${ORION_WEIGHT_MIN} y ${ORION_WEIGHT_MAX} kg para considerarse válido.`,
            path: ['weight']
          });
        }

        if (typeof data.height === 'number' && (data.height < ORION_HEIGHT_MIN || data.height > ORION_HEIGHT_MAX)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La altura debe estar entre ${ORION_HEIGHT_MIN} y ${ORION_HEIGHT_MAX} cm para considerarse válida.`,
            path: ['height']
          });
        }

        if (data.professional_attestation !== true) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Debe confirmar la validación del formulario',
            path: ['professional_attestation']
          });
        }
      }

      if (data.neuropathy_etiology === 'other') {
        addRequiredIssue('neuropathy_etiology_other');
      }
      if (data.change_reason_other_checked === true) {
        addRequiredIssue('change_reason_other');
      }

      for (const prefix of ['prev', 'current', 'concomitant']) {
        for (let treatmentNumber = 1; treatmentNumber <= 4; treatmentNumber++) {
          const startKey = `${prefix}_treatment_start_${treatmentNumber}`;
          const endKey = `${prefix}_treatment_end_${treatmentNumber}`;
          const startDate = getTime(values[startKey]);
          const endDate = getTime(values[endKey]);

          if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'La fecha de inicio no puede ser posterior a la fecha de fin',
              path: [endKey]
            });
          }
        }
      }
    })
});
