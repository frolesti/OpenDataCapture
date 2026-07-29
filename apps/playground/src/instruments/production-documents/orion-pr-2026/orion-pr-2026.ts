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

function requiresConsentAndValue<T extends Record<string, any>>(dep: string, value: any, field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', dep] as const,
    render(data: FormData): any {
      if (data.informed_consent === 'si' && data[dep] === value) {
        return field;
      }
      return null;
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

function consentWarning(): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent'] as const,
    render(data: FormData): any {
      if (data.informed_consent !== 'si') {
        return {
          kind: 'string',
          variant: 'input',
          label: '⚠️ Sin consentimiento informado no se puede continuar con el formulario.',
          disabled: true,
          className: 'text-red-600 font-bold'
        };
      }
      return null;
    }
  };
}

function eligibilityWarning(): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', ...INCLUSION_KEYS, ...EXCLUSION_KEYS] as const,
    render(data: FormData): any {
      if (data.informed_consent !== 'si') {
        return null;
      }

      const allCriteriaAnswered =
        INCLUSION_KEYS.every((key) => data[key] === 'si' || data[key] === 'no') &&
        EXCLUSION_KEYS.every((key) => data[key] === 'si' || data[key] === 'no');

      if (!allCriteriaAnswered) {
        return {
          kind: 'string',
          variant: 'input',
          label: '⚠️ Complete todos los criterios de selección para desbloquear el resto de secciones.',
          disabled: true,
          className: 'text-amber-700 font-bold'
        };
      }

      if (!isEligible(data)) {
        return {
          kind: 'string',
          variant: 'input',
          label: '⚠️ El paciente no cumple con los criterios de selección.',
          disabled: true,
          className: 'text-red-600 font-bold'
        };
      }

      return null;
    }
  };
}

function eq5d5lFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';
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
      label: `Actividades cotidianas${labelSuffix}`,
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
      kind: 'number',
      variant: 'input',
      label: `¿Cómo considera su estado de salud hoy en una escala de 0 a 100?${labelSuffix}`,
      description: 'Donde 100 es la mejor salud que pueda imaginar y 0 la peor'
    })
  };
}

function sleepQualityFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';
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

function adherenceFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';

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

function generateTreatmentFields(
  prefix: 'prev' | 'current',
  sectionLabel: string,
  maxTreatments = 5
): Record<string, any> {
  const fields: Record<string, any> = {
    [`${prefix}_treatments_note`]: requiresEligibility({
      kind: 'string',
      variant: 'input',
      label: `Nota: complete tratamiento, dosis (mg), fecha inicio y fecha fin (${sectionLabel}).`,
      disabled: true
    })
  };

  for (let i = 1; i <= maxTreatments; i++) {
    const needsPrevious = i === 1 ? null : `${prefix}_add_treatment_${i}`;

    const fieldRenderer = (field: Record<string, any>) => {
      if (!needsPrevious) {
        return requiresEligibility(field);
      }
      return requiresEligibilityAndValue(needsPrevious, 'si', field);
    };

    fields[`${prefix}_treatment_header_${i}`] = fieldRenderer({
      kind: 'string',
      variant: 'input',
      label: `Tratamiento ${i}`,
      disabled: true
    });

    fields[`${prefix}_treatment_name_${i}`] = fieldRenderer({
      kind: 'string',
      variant: 'input',
      label: `Nombre del tratamiento ${i}`
    });

    fields[`${prefix}_treatment_dose_mg_${i}`] = fieldRenderer({
      kind: 'number',
      variant: 'input',
      label: `Dosis (mg) del tratamiento ${i}`
    });

    fields[`${prefix}_treatment_start_${i}`] = fieldRenderer({
      kind: 'string',
      variant: 'input',
      placeholder: 'DD-MM-YYYY',
      label: `Fecha inicio del tratamiento ${i}`
    });

    fields[`${prefix}_treatment_end_${i}`] = fieldRenderer({
      kind: 'string',
      variant: 'input',
      placeholder: 'DD-MM-YYYY',
      label: `Fecha fin del tratamiento ${i}`
    });

    if (i < maxTreatments) {
      fields[`${prefix}_add_treatment_${i + 1}`] = {
        kind: 'dynamic' as const,
        deps: [
          'informed_consent',
          ...INCLUSION_KEYS,
          ...EXCLUSION_KEYS,
          `${prefix}_treatment_name_${i}`,
          `${prefix}_treatment_dose_mg_${i}`,
          `${prefix}_treatment_start_${i}`,
          `${prefix}_treatment_end_${i}`,
          ...(i > 1 ? [`${prefix}_add_treatment_${i}`] : [])
        ] as const,
        render(data: FormData): any {
          if (!isEligible(data)) {
            return null;
          }

          if (i > 1 && data[`${prefix}_add_treatment_${i}`] !== 'si') {
            return null;
          }

          const currentComplete =
            !!data[`${prefix}_treatment_name_${i}`] &&
            data[`${prefix}_treatment_dose_mg_${i}`] !== undefined &&
            !!data[`${prefix}_treatment_start_${i}`] &&
            !!data[`${prefix}_treatment_end_${i}`];

          if (!currentComplete) {
            return null;
          }

          return {
            kind: 'string',
            variant: 'radio',
            label: `¿Desea añadir un tratamiento ${i + 1}?`,
            options: YES_NO_OPTIONS
          };
        }
      };
    }
  }

  return fields;
}

const isValidDate = (val: string | undefined) => {
  if (!val) return true;
  const [day, month, year] = val.split('-').map(Number);
  if (day === undefined || month === undefined || year === undefined) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

function treatmentValidation(prefix: 'prev' | 'current', maxTreatments = 5): Record<string, any> {
  const schema: Record<string, any> = {};

  for (let i = 1; i <= maxTreatments; i++) {
    schema[`${prefix}_treatment_header_${i}`] = z.any().optional();
    schema[`${prefix}_treatment_name_${i}`] = z.string().optional();
    schema[`${prefix}_treatment_dose_mg_${i}`] = z.number().optional();
    schema[`${prefix}_treatment_start_${i}`] = z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' });
    schema[`${prefix}_treatment_end_${i}`] = z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' });

    if (i < maxTreatments) {
      schema[`${prefix}_add_treatment_${i + 1}`] = z.enum(['si', 'no']).optional();
    }
  }

  schema[`${prefix}_treatments_note`] = z.any().optional();

  return schema;
}

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Neuropathic Pain', 'Primary Care'],
  internal: {
    edition: 2,
    name: 'ORION_PR_2026'
  },
  content: [
    {
      title: 'DATOS DE VISITA',
      description: 'Selección del paciente - Información inicial',
      fields: {
        site_hospital: {
          kind: 'string',
          label: 'Hospital/Centro sanitario *',
          variant: 'select',
          options: (globalThis as any).__ODC_GROUP_HOSPITAL_OPTIONS__ ?? {}
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
        }
      }
    },
    {
      title: 'CRITERIOS DE INCLUSIÓN',
      description: 'Todos los criterios de inclusión deben ser SI para que el participante sea apto para el estudio',
      fields: {
        _warningInclusionStart: consentWarning() as any,
        inclusion_1: requiresConsent({
          kind: 'string',
          label:
            '1. Pacientes con diagnóstico de dolor neuropático (periférico o central) documentado en su historia clínica',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_2: requiresConsent({
          kind: 'string',
          label:
            '2. Pacientes previamente tratados con pregabalina de liberación inmediata (IR) antes de iniciar tratamiento con pregabalina de liberación prolongada (PR)',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes que hayan estado en tratamiento con pregabalina PR durante al menos 3 meses y hasta 6 meses',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_4: requiresConsent({
          kind: 'string',
          label:
            '4. Pacientes que hayan recibido pregabalina PR durante al menos el último mes a una dosis terapéutica (165-660 mg), aunque el tratamiento puede haber comenzado con dosis inferiores en la práctica clínica habitual antes de la titulación a 165 mg o superior',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_5: requiresConsent({
          kind: 'string',
          label: '5. Pacientes ≥ 18 años en el momento de la inclusión',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        inclusion_6: requiresConsent({
          kind: 'string',
          label: '6. Pacientes que hayan proporcionado consentimiento informado por escrito',
          variant: 'radio',
          options: YES_NO_OPTIONS
        })
      }
    },
    {
      title: 'CRITERIOS DE EXCLUSIÓN',
      description: 'Todos los criterios de exclusión deben ser NO para que el participante sea apto para el estudio',
      fields: {
        _warningExclusionStart: consentWarning() as any,
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
        }),
        _eligibilityWarning: eligibilityWarning() as any
      }
    },
    {
      title: 'DATOS SOCIODEMOGRÁFICOS',
      fields: {
        age: requiresEligibility({
          kind: 'number',
          variant: 'input',
          label: 'Edad (años) *'
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
          label: 'Peso (kg)'
        }),
        height: requiresEligibility({
          kind: 'number',
          variant: 'input',
          label: 'Altura (cm)'
        })
      }
    },
    {
      title: 'DIAGNÓSTICO NEUROPÁTICO',
      description: 'Clasificación etiológica y anatómica del dolor neuropático',
      fields: {
        neuropathy_etiology: requiresEligibility({
          kind: 'string',
          label: 'Diagnóstico etiológico (central/periférico) *',
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
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha diagnóstico *',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        })
      }
    },
    {
      title: 'TRATAMIENTOS PREVIOS',
      description: 'Pregabalina IR y otros tratamientos para el dolor neuropático',
      fields: {
        ...generateTreatmentFields('prev', 'tratamientos previos')
      }
    },
    {
      title: 'TRATAMIENTOS ACTUALES',
      description: 'Pregabalina PR y otros tratamientos concomitantes',
      fields: {
        ...generateTreatmentFields('current', 'tratamientos actuales')
      }
    },
    {
      title: 'MOTIVOS CAMBIO IR A PR',
      description: 'Razones del cambio de pregabalina IR a pregabalina PR',
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
      title: 'COMORBILIDADES',
      fields: {
        comorbidities_info: requiresEligibility({
          kind: 'string',
          variant: 'textarea',
          label: 'Indique comorbilidades presentes con fecha de diagnóstico'
        })
      } as any
    },
    {
      title: 'EVALUACIÓN RETROSPECTIVA - PREGABALINA IR',
      description: 'Valoraciones durante el tratamiento con pregabalina IR',
      fields: {
        ...eq5d5lFields('retrospective'),
        ...sleepQualityFields('retrospective'),
        ...adherenceFields('retrospective')
      }
    },
    {
      title: 'EVALUACIÓN PROSPECTIVA - PREGABALINA PR',
      description: 'Valoraciones actuales durante el tratamiento con pregabalina PR',
      fields: {
        ...eq5d5lFields('prospective'),
        ...sleepQualityFields('prospective'),
        ...adherenceFields('prospective'),
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
        })
      }
    },
    {
      title: 'SEGUIMIENTO - 3 MESES',
      description: 'Valoración de seguimiento a los 3 meses ± 2 semanas',
      fields: {
        followup_date: requiresEligibility({
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de visita de seguimiento *',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        }),
        ...eq5d5lFields('prospective'),
        ...sleepQualityFields('prospective'),
        ...adherenceFields('prospective'),
        objective_achieved: requiresEligibility({
          kind: 'string',
          label: '¿Se ha alcanzado el objetivo que motivó el cambio a pregabalina PR?',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        dose_change: requiresEligibility({
          kind: 'string',
          label: '¿Ha tenido algún cambio en la dosis de la pregabalina PR desde su última visita?',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        dose_change_date: requiresEligibilityAndValue('dose_change', 'si', {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha del cambio de dosis',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        }),
        new_dose: requiresEligibilityAndValue('dose_change', 'si', {
          kind: 'number',
          variant: 'input',
          label: 'Nueva dosis (mg)'
        })
      }
    },
    {
      title: 'EVENTOS ADVERSOS',
      fields: {
        adverse_events: requiresEligibility({
          kind: 'string',
          label: '¿Ha presentado algún acontecimiento adverso durante el tratamiento?',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        adverse_events_details: requiresEligibilityAndValue('adverse_events', 'si', {
          kind: 'string',
          label: 'Detalles del acontecimiento adverso',
          variant: 'textarea'
        })
      }
    },
    {
      title: 'FINALIZACIÓN DEL ESTUDIO',
      fields: {
        end_date: requiresEligibility({
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de finalización del estudio',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        }),
        study_completed: requiresEligibility({
          kind: 'string',
          label: '¿Ha completado el paciente el estudio?',
          variant: 'radio',
          options: YES_NO_OPTIONS
        }),
        reason_not_completed: requiresEligibilityAndValue('study_completed', 'no', {
          kind: 'string',
          label: 'En caso negativo, indique el motivo',
          variant: 'select',
          options: {
            investigator: 'Decisión del investigador',
            patient: 'Decisión del paciente',
            other: 'Otro'
          }
        }),
        reason_not_completed_other: requiresEligibilityAndValue('reason_not_completed', 'other', {
          kind: 'string',
          label: 'Especifique otro motivo',
          variant: 'textarea'
        })
      }
    },
    {
      title: 'PROFESIONAL SANITARIO',
      fields: {
        professional_initials: requiresEligibility({
          kind: 'string',
          variant: 'input',
          label: 'Iniciales del profesional sanitario',
          description: 'Introduzca las iniciales de quien rellena el formulario'
        }),
        professional_signature: requiresEligibility({
          kind: 'string',
          label: 'Firma del profesional sanitario',
          variant: 'input',
          description: 'Campo para firma digital o impresa'
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
    title: 'ORION-PR-2026',
    description:
      'Estudio longitudinal, observacional, ambispectivo y multicéntrico para evaluar los cambios en la calidad de vida de pacientes con dolor neuropático tratados con pregabalina de liberación prolongada.',
    license: 'Apache-2.0',
    authors: ['Equipo de Investigación ORION']
  },
  measures: {},
  validationSchema: z.object({
    site_hospital: z.string().optional(),
    informed_consent: z.enum(['si', 'no']),

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

    _warningInclusionStart: z.any().optional(),
    _warningExclusionStart: z.any().optional(),
    _eligibilityWarning: z.any().optional(),

    age: z.number().optional(),
    sex: z.enum(['femenino', 'masculino']).optional(),
    weight: z.number().optional(),
    height: z.number().optional(),

    neuropathy_etiology: z.string().optional(),
    neuropathy_etiology_other: z.string().optional(),
    neuropathy_location: z.enum(['central', 'peripheral']).optional(),
    diagnosis_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),

    ...treatmentValidation('prev'),
    ...treatmentValidation('current'),

    change_reason_adherence: z.boolean().optional(),
    change_reason_efficacy: z.boolean().optional(),
    change_reason_tolerability: z.boolean().optional(),
    change_reason_patient_pref: z.boolean().optional(),
    change_reason_investigator_pref: z.boolean().optional(),
    change_reason_other_checked: z.boolean().optional(),
    change_reason_other: z.string().optional(),

    comorbidities_info: z.string().optional(),

    retro_eq5d_mobility: z.enum(['1', '2', '3', '4', '5']).optional(),
    retro_eq5d_selfcare: z.enum(['1', '2', '3', '4', '5']).optional(),
    retro_eq5d_activities: z.enum(['1', '2', '3', '4', '5']).optional(),
    retro_eq5d_pain: z.enum(['1', '2', '3', '4', '5']).optional(),
    retro_eq5d_anxiety: z.enum(['1', '2', '3', '4', '5']).optional(),
    retro_eq5d_vas: z.number().min(0).max(100).optional(),
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
    prosp_eq5d_vas: z.number().min(0).max(100).optional(),
    prosp_sleep_onset: z.enum(['1', '2', '3', '4', '5']).optional(),
    prosp_sleep_maintenance: z.enum(['1', '2', '3', '4', '5']).optional(),
    prosp_sleep_quality: z.enum(['1', '2', '3', '4', '5']).optional(),
    prosp_sleep_daytime: z.enum(['1', '2', '3', '4', '5']).optional(),
    prosp_mmas_forget: z.enum(['si', 'no']).optional(),
    prosp_mmas_remember: z.enum(['si', 'no']).optional(),
    prosp_mmas_better: z.enum(['si', 'no']).optional(),
    prosp_mmas_worse: z.enum(['si', 'no']).optional(),

    cgi_improvement: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']).optional(),

    followup_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),
    objective_achieved: z.enum(['si', 'no']).optional(),
    dose_change: z.enum(['si', 'no']).optional(),
    dose_change_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),
    new_dose: z.number().optional(),

    adverse_events: z.enum(['si', 'no']).optional(),
    adverse_events_details: z.string().optional(),

    end_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),
    study_completed: z.enum(['si', 'no']).optional(),
    reason_not_completed: z.enum(['investigator', 'patient', 'other']).optional(),
    reason_not_completed_other: z.string().optional(),

    professional_initials: z.string().optional(),
    professional_signature: z.string().optional()
  })
});
