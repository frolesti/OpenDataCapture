import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

// Helper function to make a field conditional on informed consent
function requiresConsent<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic',
    deps: ['informed_consent'],
    render(data: any): any {
      if (data.informed_consent === 'si') {
        return field;
      }
      return null;
    }
  };
}

// Helper function to show warning message when consent is NOT granted
function consentWarning(): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent'] as const,
    render(data: any): any {
      if (data.informed_consent !== 'si') {
        return {
          kind: 'string',
          variant: 'input',
          label: '⚠️ Esta sección requiere consentimiento informado del paciente',
          disabled: true
        };
      }
      return null;
    }
  };
}

// Helper function to show fields conditionally based on criteria
function requiresAllInclusion<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      'inclusion_1',
      'inclusion_2',
      'inclusion_3',
      'inclusion_4',
      'inclusion_5',
      'inclusion_6'
    ] as const,
    render(data: any): any {
      const allInclusionMet =
        data.informed_consent === 'si' &&
        data.inclusion_1 === 'si' &&
        data.inclusion_2 === 'si' &&
        data.inclusion_3 === 'si' &&
        data.inclusion_4 === 'si' &&
        data.inclusion_5 === 'si' &&
        data.inclusion_6 === 'si';

      const noExclusion =
        data.exclusion_1 === 'no' &&
        data.exclusion_2 === 'no' &&
        data.exclusion_3 === 'no' &&
        data.exclusion_4 === 'no' &&
        data.exclusion_5 === 'no' &&
        data.exclusion_6 === 'no';

      if (allInclusionMet && noExclusion) {
        return field;
      }
      return null;
    }
  };
}

// Helper for EQ-5D-5L retrospective/prospective evaluations
function eq5d5lFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';
  const label_suffix =
    timeframe === 'retrospective' ? ' (durante tratamiento con pregabalina IR)' : ' (actualmente con pregabalina PR)';

  return {
    [`${prefix}eq5d_mobility`]: {
      kind: 'string',
      label: `Movilidad${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para caminar',
        '2': 'Tengo problemas leves para caminar',
        '3': 'Tengo problemas moderados para caminar',
        '4': 'Tengo problemas graves para caminar',
        '5': 'No puedo caminar'
      }
    },
    [`${prefix}eq5d_selfcare`]: {
      kind: 'string',
      label: `Auto-cuidado${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para lavarme o vestirme',
        '2': 'Tengo problemas leves para lavarme o vestirme',
        '3': 'Tengo problemas moderados para lavarme o vestirme',
        '4': 'Tengo problemas graves para lavarme o vestirme',
        '5': 'No puedo lavarme o vestirme'
      }
    },
    [`${prefix}eq5d_activities`]: {
      kind: 'string',
      label: `Actividades cotidianas${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo problemas para realizar mis actividades cotidianas',
        '2': 'Tengo problemas leves para realizar mis actividades cotidianas',
        '3': 'Tengo problemas moderados para realizar mis actividades cotidianas',
        '4': 'Tengo problemas graves para realizar mis actividades cotidianas',
        '5': 'No puedo realizar mis actividades cotidianas'
      }
    },
    [`${prefix}eq5d_pain`]: {
      kind: 'string',
      label: `Dolor/Malestar${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'No tengo dolor ni malestar',
        '2': 'Tengo dolor o malestar leve',
        '3': 'Tengo dolor o malestar moderado',
        '4': 'Tengo dolor o malestar fuerte',
        '5': 'Tengo dolor o malestar extremo'
      }
    },
    [`${prefix}eq5d_anxiety`]: {
      kind: 'string',
      label: `Ansiedad/Depresión${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'No estoy ansioso ni deprimido',
        '2': 'Estoy levemente ansioso o deprimido',
        '3': 'Estoy moderadamente ansioso o deprimido',
        '4': 'Estoy muy ansioso o deprimido',
        '5': 'Estoy extremadamente ansioso o deprimido'
      }
    },
    [`${prefix}eq5d_vas`]: {
      kind: 'numeric',
      label: `¿Cómo considera su estado de salud hoy en una escala de 0 a 100?${label_suffix}`,
      range: [0, 100],
      description: 'Donde 100 es la mejor salud que pueda imaginar y 0 la peor'
    }
  };
}

// Helper for sleep quality questions
function sleepQualityFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';
  const label_suffix =
    timeframe === 'retrospective' ? ' (durante pregabalina IR)' : ' (actualmente con pregabalina PR)';

  return {
    [`${prefix}sleep_onset`]: {
      kind: 'string',
      label: `¿Tenías dificultad para quedarte dormido al acostarte?${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    },
    [`${prefix}sleep_maintenance`]: {
      kind: 'string',
      label: `¿Tenías dificultad para mantener el sueño durante la noche?${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    },
    [`${prefix}sleep_quality`]: {
      kind: 'string',
      label: `¿Cómo valorarías la calidad global de tu sueño?${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'Muy buena',
        '2': 'Buena',
        '3': 'Regular',
        '4': 'Mala',
        '5': 'Muy mala'
      }
    },
    [`${prefix}sleep_daytime`]: {
      kind: 'string',
      label: `¿Tiene somnolencia diurna?${label_suffix}`,
      variant: 'radio',
      options: {
        '1': 'Nunca',
        '2': 'Pocas veces',
        '3': 'Algunas veces',
        '4': 'Con frecuencia',
        '5': 'Siempre'
      }
    }
  };
}

// Helper for MMAS-4 adherence scale
function adherenceFields(timeframe: 'retrospective' | 'prospective'): Record<string, any> {
  const prefix = timeframe === 'retrospective' ? 'retro_' : 'prosp_';

  return {
    [`${prefix}mmas_forget`]: {
      kind: 'string',
      label: '¿Alguna vez olvida tomar su medicación?',
      variant: 'radio',
      options: {
        si: 'Sí',
        no: 'No'
      }
    },
    [`${prefix}mmas_remember`]: {
      kind: 'string',
      label: '¿Alguna vez tiene problemas para recordar tomar su medicación?',
      variant: 'radio',
      options: {
        si: 'Sí',
        no: 'No'
      }
    },
    [`${prefix}mmas_better`]: {
      kind: 'string',
      label: 'Cuando se siente mejor, ¿a veces deja de tomar su medicación?',
      variant: 'radio',
      options: {
        si: 'Sí',
        no: 'No'
      }
    },
    [`${prefix}mmas_worse`]: {
      kind: 'string',
      label: 'A veces, si se siente peor cuando toma su medicación, ¿deja de tomarla?',
      variant: 'radio',
      options: {
        si: 'Sí',
        no: 'No'
      }
    }
  };
}

// Helper function to validate dates
const isValidDate = (val: string | undefined) => {
  if (!val) return true;
  const [day, month, year] = val.split('-').map(Number);
  if (day === undefined || month === undefined || year === undefined) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export default defineInstrument({
  kind: 'FORM',
  language: 'es',
  tags: ['Clinical Research', 'Neuropathic Pain', 'Primary Care'],
  internal: {
    edition: 1,
    name: 'ORION_PR_2026'
  },
  content: [
    {
      title: 'DATOS DE VISITA',
      description: 'Selección del paciente - Información inicial',
      fields: {
        visit_date: {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de visita *',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
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
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        informed_consent_date: requiresConsent({
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha en la que el paciente firma el consentimiento informado',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        })
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
          options: { si: 'Sí', no: 'No' }
        }),
        inclusion_2: requiresConsent({
          kind: 'string',
          label:
            '2. Pacientes previamente tratados con pregabalina de liberación inmediata (IR) antes de iniciar tratamiento con pregabalina de liberación prolongada (PR)',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        inclusion_3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes que hayan estado en tratamiento con pregabalina PR durante al menos 3 meses y hasta 6 meses',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        inclusion_4: requiresConsent({
          kind: 'string',
          label:
            '4. Pacientes que hayan recibido pregabalina PR durante al menos el último mes a una dosis terapéutica (165-660 mg)',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        inclusion_5: requiresConsent({
          kind: 'string',
          label: '5. Pacientes ≥ 18 años en el momento de la inclusión',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        inclusion_6: requiresConsent({
          kind: 'string',
          label: '6. Pacientes que hayan proporcionado consentimiento informado por escrito',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
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
          options: { si: 'Sí', no: 'No' }
        }),
        exclusion_2: requiresConsent({
          kind: 'string',
          label: '2. Uso de pregabalina PR fuera de la ficha técnica aprobada localmente',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        exclusion_3: requiresConsent({
          kind: 'string',
          label: '3. Pacientes que no puedan cumplir con los requisitos del estudio',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        exclusion_4: requiresConsent({
          kind: 'string',
          label: '4. Pacientes con cualquier contraindicación a pregabalina PR según la ficha técnica del producto',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        exclusion_5: requiresConsent({
          kind: 'string',
          label: '5. Cualquier situación clínica en la que el investigador considere que el tratamiento no es seguro',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        exclusion_6: requiresConsent({
          kind: 'string',
          label:
            '6. Participación en otro estudio clínico o de investigación que pueda interferir con la interpretación de los datos',
          variant: 'radio',
          options: { si: 'Sí', no: 'No' }
        }),
        _warningExclusionCriteria: {
          kind: 'dynamic' as const,
          deps: [
            'inclusion_1',
            'inclusion_2',
            'inclusion_3',
            'inclusion_4',
            'inclusion_5',
            'inclusion_6',
            'exclusion_1',
            'exclusion_2',
            'exclusion_3',
            'exclusion_4',
            'exclusion_5',
            'exclusion_6'
          ] as const,
          render(data: any) {
            const inclusionOk =
              data.inclusion_1 === 'si' &&
              data.inclusion_2 === 'si' &&
              data.inclusion_3 === 'si' &&
              data.inclusion_4 === 'si' &&
              data.inclusion_5 === 'si' &&
              data.inclusion_6 === 'si';

            const exclusionOk =
              data.exclusion_1 === 'no' &&
              data.exclusion_2 === 'no' &&
              data.exclusion_3 === 'no' &&
              data.exclusion_4 === 'no' &&
              data.exclusion_5 === 'no' &&
              data.exclusion_6 === 'no';

            if (!inclusionOk || !exclusionOk) {
              return {
                kind: 'string',
                variant: 'input',
                label: '⚠️ El paciente no cumple con los criterios de selección',
                disabled: true,
                className: 'text-red-600 font-bold'
              };
            }
            return null;
          }
        } as any
      }
    },
    {
      title: 'DATOS SOCIODEMOGRÁFICOS',
      fields: {
        _warningDemographics: requiresAllInclusion({
          kind: 'string',
          variant: 'input',
          label: '',
          disabled: true
        } as any),
        age: requiresConsent({
          kind: 'numeric',
          label: 'Edad (años) *',
          range: [18, 120]
        }),
        sex: requiresConsent({
          kind: 'string',
          label: 'Sexo *',
          variant: 'radio',
          options: {
            femenino: 'Femenino',
            masculino: 'Masculino'
          }
        }),
        weight: requiresConsent({
          kind: 'numeric',
          label: 'Peso (kg)'
        }),
        height: requiresConsent({
          kind: 'numeric',
          label: 'Altura (cm)'
        })
      }
    },
    {
      title: 'DIAGNÓSTICO NEUROPÁTICO',
      description: 'Clasificación etiológica y anatómica del dolor neuropático',
      fields: {
        _warningDiagnosis: consentWarning() as any,
        neuropathy_etiology: requiresConsent({
          kind: 'string',
          label: 'Diagnóstico etiológico (central/periférico) *',
          variant: 'select',
          options: {
            spinal_injury: 'Dolor neuropático relacionado con lesión medular',
            post_stroke: 'Dolor neuropático central post ictus',
            ms_associated: 'Dolor central neuropático asociado a la esclerosis múltiple',
            trigeminal_neuralgia: 'Neuralgia del trigémio',
            postherpetic: 'Neuralgia postherpética',
            diabetic: 'Neuropatía diabética',
            nerve_injury: 'Dolor neuropático asociado a lesión de nervio periférico',
            post_amputation: 'Dolor neuropático post amputación',
            polyneuropathy: 'Dolor neuropático asociado a polineuropatía',
            radiculopathy: 'Dolor neuropático asociado a radiculopatía',
            hiv_associated: 'Dolor neuropático asociado a VIH',
            other: 'Otro (Especificar)'
          }
        }),
        neuropathy_etiology_other: requiresConsent({
          kind: 'string',
          label: 'Especifique otro diagnóstico',
          variant: 'textarea'
        }),
        neuropathy_location: requiresConsent({
          kind: 'string',
          label: 'Clasificación anatómica *',
          variant: 'radio',
          options: {
            central: 'Central',
            peripheral: 'Periférico'
          }
        }),
        diagnosis_date: requiresConsent({
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
        _warningPrevTreatments: consentWarning() as any,
        prev_treatments_info: {
          kind: 'string',
          variant: 'input',
          label: 'Nota: Indique fecha inicio, fecha fin, y dosis (mg) de cada tratamiento',
          disabled: true
        }
      }
    },
    {
      title: 'TRATAMIENTOS ACTUALES',
      description: 'Pregabalina PR y otros tratamientos concomitantes',
      fields: {
        _warningCurrentTreatments: consentWarning() as any,
        current_treatments_info: {
          kind: 'string',
          variant: 'input',
          label: 'Nota: Indique fecha inicio, fecha fin, y dosis (mg) actual de pregabalina PR',
          disabled: true
        }
      }
    },
    {
      title: 'MOTIVOS CAMBIO IR A PR',
      description: 'Razones del cambio de pregabalina IR a pregabalina PR',
      fields: {
        _warningChangeReasons: consentWarning() as any,
        change_reason_adherence: requiresConsent({
          kind: 'boolean',
          label: 'Falta de adherencia'
        }),
        change_reason_efficacy: requiresConsent({
          kind: 'boolean',
          label: 'Falta de eficacia'
        }),
        change_reason_tolerability: requiresConsent({
          kind: 'boolean',
          label: 'Falta de tolerabilidad'
        }),
        change_reason_patient_pref: requiresConsent({
          kind: 'boolean',
          label: 'Preferencia del paciente'
        }),
        change_reason_investigator_pref: requiresConsent({
          kind: 'boolean',
          label: 'Preferencia del investigador'
        }),
        change_reason_other: requiresConsent({
          kind: 'string',
          label: 'Otros (Especificar)',
          variant: 'textarea'
        })
      }
    },
    {
      title: 'COMORBILIDADES',
      fields: {
        _warningComorbidities: consentWarning() as any,
        comorbidities_info: {
          kind: 'string',
          variant: 'input',
          label: 'Indique comorbilidades presentes con fecha de diagnóstico',
          disabled: true
        }
      }
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
        cgi_improvement: {
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
        }
      }
    },
    {
      title: 'SEGUIMIENTO - 3 MESES',
      description: 'Valoración de seguimiento a los 3 meses ± 2 semanas',
      fields: {
        followup_date: {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de visita de seguimiento *',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        },
        ...eq5d5lFields('prospective'),
        ...sleepQualityFields('prospective'),
        ...adherenceFields('prospective'),
        objective_achieved: {
          kind: 'string',
          label: '¿Se ha alcanzado el objetivo que motivó el cambio a pregabalina PR?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        dose_change: {
          kind: 'string',
          label: '¿Ha tenido algún cambio en la dosis de la pregabalina PR desde su última visita?',
          variant: 'radio',
          options: {
            no: 'No',
            si: 'Sí'
          }
        },
        dose_change_date: {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha del cambio de dosis',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        },
        new_dose: {
          kind: 'numeric',
          label: 'Nueva dosis (mg)',
          range: [0, 1000]
        }
      }
    },
    {
      title: 'EVENTOS ADVERSOS',
      fields: {
        adverse_events: {
          kind: 'string',
          label: '¿Ha presentado algún acontecimiento adverso durante el tratamiento?',
          variant: 'radio',
          options: {
            no: 'No',
            si: 'Sí'
          }
        },
        adverse_events_details: {
          kind: 'string',
          label: 'Detalles del acontecimiento adverso',
          variant: 'textarea'
        }
      }
    },
    {
      title: 'FINALIZACIÓN DEL ESTUDIO',
      fields: {
        end_date: {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de finalización del estudio',
          description: 'Introduzca la fecha en formato DD-MM-YYYY'
        },
        study_completed: {
          kind: 'string',
          label: '¿Ha completado el paciente el estudio?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        reason_not_completed: {
          kind: 'string',
          label: 'En caso negativo, indique el motivo',
          variant: 'select',
          options: {
            investigator: 'Decisión del investigador',
            patient: 'Decisión del paciente',
            other: 'Otro (Especificar)'
          }
        },
        reason_not_completed_other: {
          kind: 'string',
          label: 'Especifique otro motivo',
          variant: 'textarea'
        }
      }
    },
    {
      title: 'PROFESIONAL SANITARIO',
      fields: {
        professional_initials: {
          kind: 'string',
          variant: 'input',
          label: 'Iniciales del profesional sanitario',
          description: 'Introduzca las iniciales de quién rellena el formulario'
        },
        professional_signature: {
          kind: 'string',
          label: 'Firma del profesional sanitario',
          variant: 'input',
          description: 'Campo para firma digital o impresa'
        }
      }
    }
  ],
  validationSchema: z.object({
    visit_date: z.string().refine(isValidDate, { message: 'Fecha inválida' }),
    informed_consent: z.enum(['si', 'no']),
    informed_consent_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),
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
    diagnosis_date: z
      .string()
      .optional()
      .refine((val) => !val || isValidDate(val), { message: 'Fecha inválida' }),
    change_reason_adherence: z.boolean().optional(),
    change_reason_efficacy: z.boolean().optional(),
    change_reason_tolerability: z.boolean().optional(),
    change_reason_patient_pref: z.boolean().optional(),
    change_reason_investigator_pref: z.boolean().optional(),
    change_reason_other: z.string().optional(),
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
