import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const YES_NO_OPTIONS = { no: 'No', si: 'Sí' } as const;
const SCALE_OPTIONS = {
  '1': 'No evaluado',
  '2': 'Mucho mejor',
  '3': 'Bastante mejor',
  '4': 'Ligeramente mejor',
  '5': 'Sin cambios',
  '6': 'Ligeramente peor',
  '7': 'Bastante peor',
  '8': 'Mucho peor'
} as const;
const PHARMACOVIGILANCE_INSTRUCTION =
  'Si la reacción adversa cumple los criterios de registro sistemático del protocolo (grave o de especial interés), cumplimente el registro de reacciones adversas, rellene el formulario de notificación y envíelo a farmacovigilancia@gebro.es en menos de 24 horas. Para cualquier otra reacción adversa, notifíquela al Sistema Español de Farmacovigilancia siguiendo su práctica clínica habitual.';

const DATE_FORMAT_ERROR = 'Formato de fecha inválido. Use DD-MM-AAAA';

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

function requiredManualDateSchema() {
  return z.any().transform((value, context) => {
    if (value === undefined || value === null || value === '') {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Este campo es obligatorio' });
      return z.NEVER;
    }

    const parsed = parseManualDate(value);
    if (!parsed) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: DATE_FORMAT_ERROR });
      return z.NEVER;
    }

    return parsed;
  });
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

function dateField(label: string) {
  return {
    kind: 'string' as const,
    variant: 'input' as const,
    label,
    placeholder: 'DD-MM-AAAA'
  };
}

function conditionalField<T extends Record<string, any>>(dependency: string, value: unknown, field: T) {
  return {
    kind: 'dynamic' as const,
    deps: [dependency] as const,
    render(data: Record<string, unknown>): T | null {
      return data[dependency] === value ? field : null;
    }
  };
}

function eq5dFields() {
  return {
    eq5d_mobility: {
      kind: 'string' as const,
      label: 'Movilidad',
      options: {
        '1': 'No tengo problemas para caminar',
        '2': 'Tengo problemas leves para caminar',
        '3': 'Tengo problemas moderados para caminar',
        '4': 'Tengo problemas graves para caminar',
        '5': 'No puedo caminar'
      },
      variant: 'radio' as const
    },
    eq5d_selfcare: {
      kind: 'string' as const,
      label: 'Auto-cuidado',
      options: {
        '1': 'No tengo problemas para lavarme o vestirme',
        '2': 'Tengo problemas leves para lavarme o vestirme',
        '3': 'Tengo problemas moderados para lavarme o vestirme',
        '4': 'Tengo problemas graves para lavarme o vestirme',
        '5': 'No puedo lavarme o vestirme'
      },
      variant: 'radio' as const
    },
    eq5d_activities: {
      kind: 'string' as const,
      label: 'Actividades cotidianas (Ej.: trabajar, estudiar, tareas domésticas, actividades familiares o de ocio)',
      options: {
        '1': 'No tengo problemas para realizar mis actividades cotidianas',
        '2': 'Tengo problemas leves para realizar mis actividades cotidianas',
        '3': 'Tengo problemas moderados para realizar mis actividades cotidianas',
        '4': 'Tengo problemas graves para realizar mis actividades cotidianas',
        '5': 'No puedo realizar mis actividades cotidianas'
      },
      variant: 'radio' as const
    },
    eq5d_pain: {
      kind: 'string' as const,
      label: 'Dolor/Malestar',
      options: {
        '1': 'No tengo dolor ni malestar',
        '2': 'Tengo dolor o malestar leve',
        '3': 'Tengo dolor o malestar moderado',
        '4': 'Tengo dolor o malestar fuerte',
        '5': 'Tengo dolor o malestar extremo'
      },
      variant: 'radio' as const
    },
    eq5d_anxiety: {
      kind: 'string' as const,
      label: 'Ansiedad/Depresión',
      options: {
        '1': 'No estoy ansioso ni deprimido',
        '2': 'Estoy levemente ansioso o deprimido',
        '3': 'Estoy moderadamente ansioso o deprimido',
        '4': 'Estoy muy ansioso o deprimido',
        '5': 'Estoy extremadamente ansioso o deprimido'
      },
      variant: 'radio' as const
    },
    eq5d_vas: {
      description: 'Donde 100 es la mejor salud que pueda imaginar y 0 la peor.',
      kind: 'string' as const,
      label: '¿Cómo considera su estado de salud hoy en una escala de 0 a 100?',
      placeholder: 'Su salud hoy',
      variant: 'input' as const
    }
  };
}

function sleepFields() {
  const frequencyOptions = {
    '1': 'Nunca',
    '2': 'Pocas veces',
    '3': 'Algunas veces',
    '4': 'Con frecuencia',
    '5': 'Siempre'
  };
  return {
    sleep_onset: {
      kind: 'string' as const,
      label: '¿Tiene dificultad para quedarse dormido al acostarse?',
      options: frequencyOptions,
      variant: 'radio' as const
    },
    sleep_maintenance: {
      kind: 'string' as const,
      label: '¿Tiene dificultad para mantener el sueño durante la noche?',
      options: frequencyOptions,
      variant: 'radio' as const
    },
    sleep_quality: {
      kind: 'string' as const,
      label: '¿Cómo valora la calidad global de su sueño?',
      options: { '1': 'Muy buena', '2': 'Buena', '3': 'Regular', '4': 'Mala', '5': 'Muy mala' },
      variant: 'radio' as const
    },
    sleep_daytime: {
      kind: 'string' as const,
      label: '¿Tiene somnolencia diurna?',
      options: frequencyOptions,
      variant: 'radio' as const
    }
  };
}

function adherenceFields() {
  return {
    mmas_forget: {
      kind: 'string' as const,
      label: '¿Alguna vez olvida tomar su medicación?',
      options: YES_NO_OPTIONS,
      variant: 'radio' as const
    },
    mmas_remember: {
      kind: 'string' as const,
      label: '¿Alguna vez tiene problemas para recordar tomar su medicación?',
      options: YES_NO_OPTIONS,
      variant: 'radio' as const
    },
    mmas_better: {
      kind: 'string' as const,
      label: 'Cuando se siente mejor, ¿a veces deja de tomar su medicación?',
      options: YES_NO_OPTIONS,
      variant: 'radio' as const
    },
    mmas_worse: {
      kind: 'string' as const,
      label: 'A veces, si se siente peor cuando toma su medicación, ¿deja de tomarla?',
      options: YES_NO_OPTIONS,
      variant: 'radio' as const
    }
  };
}

const responseSchema = z.enum(['1', '2', '3', '4', '5']);

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Neuropathic Pain', 'Primary Care'],
  internal: { edition: 1, name: 'ORION_PR_2026_FOLLOWUP' },
  content: [
    {
      title: 'CÓDIGO DEL USUARIO',
      fields: { user_code: { kind: 'string', label: 'Código del usuario *', variant: 'input' } }
    },
    {
      title: 'VISITA DE SEGUIMIENTO (A LOS TRES MESES ± 2 SEMANAS)',
      fields: { followup_date: dateField('Fecha de visita *') }
    },
    {
      title: 'EVALUACIÓN PROSPECTIVA DE LAS ESCALAS - CALIDAD DE VIDA (CUESTIONARIO EQ-5D-5L)',
      description: 'Referida al momento actual, durante el tratamiento con pregabalina PR',
      fields: eq5dFields()
    },
    {
      title: 'CALIDAD DE SUEÑO',
      description: 'Actualmente, durante el tratamiento con pregabalina PR',
      fields: sleepFields()
    },
    {
      title: 'ADHERENCIA AL TRATAMIENTO (ESCALA MMAS-4)',
      fields: adherenceFields()
    },
    {
      title: 'MEJORÍA CLÍNICA (ESCALA CGI-I)',
      description:
        'Califique la mejoría global, independientemente de si, según su juicio clínico, se debe por completo al tratamiento farmacológico. En comparación con su estado basal, ¿cuánto ha cambiado?',
      fields: {
        cgi_improvement: {
          kind: 'string',
          label: 'En comparación con su estado basal, ¿cuánto ha cambiado?',
          options: SCALE_OPTIONS,
          variant: 'radio'
        }
      }
    },
    {
      title: 'CAMBIO DE PREGABALINA IR A PREGABALINA PR',
      fields: {
        objective_achieved: {
          kind: 'string',
          label: '¿Se ha alcanzado el objetivo que motivó el cambio a pregabalina PR?',
          options: YES_NO_OPTIONS,
          variant: 'radio'
        },
        dose_change: {
          kind: 'string',
          label: '¿Ha tenido algún cambio en la dosis de la pregabalina PR desde su última visita?',
          options: YES_NO_OPTIONS,
          variant: 'radio'
        },
        dose_change_date: conditionalField('dose_change', 'si', dateField('Fecha del cambio de dosis')),
        new_dose: conditionalField('dose_change', 'si', { kind: 'number', label: 'Nueva dosis (mg)', variant: 'input' })
      }
    },
    {
      title: 'ACONTECIMIENTOS ADVERSOS',
      fields: {
        adverse_events: {
          kind: 'string',
          label: '¿Ha presentado algún acontecimiento adverso durante el periodo de estudio?',
          options: YES_NO_OPTIONS,
          variant: 'radio'
        },
        _pharmacovigilance_instruction: conditionalField('adverse_events', 'si', {
          description: PHARMACOVIGILANCE_INSTRUCTION,
          disabled: true,
          kind: 'string',
          label: 'Instrucciones de farmacovigilancia',
          variant: 'textarea'
        })
      }
    },
    {
      title: 'FORMULARIO FIN DE ESTUDIO',
      fields: {
        end_date: dateField('¿Fecha en que se rellena el formulario de fin de estudio?'),
        study_completed: {
          kind: 'string',
          label: '¿Ha completado el paciente el estudio?',
          options: YES_NO_OPTIONS,
          variant: 'radio'
        },
        reason_not_completed: conditionalField('study_completed', 'no', {
          kind: 'string',
          label: 'En caso negativo, indique el motivo',
          options: { investigator: 'Decisión del investigador', patient: 'Decisión del paciente', other: 'Otro' },
          variant: 'select'
        }),
        reason_not_completed_other: conditionalField('reason_not_completed', 'other', {
          kind: 'string',
          label: 'Especifique otro motivo',
          variant: 'textarea'
        }),
        professional_attestation: {
          kind: 'boolean',
          label:
            'Confirmo que he revisado y validado la información clínica registrada en este formulario conforme a la historia clínica del paciente',
          variant: 'checkbox'
        }
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 12,
    instructions: ['Complete todas las respuestas antes de guardar la visita de seguimiento.']
  },
  details: {
    title: 'ORION-PR-2026 - Visita de seguimiento a 3 meses',
    description: 'Visita de seguimiento del estudio ORION-PR-2026.',
    license: 'Apache-2.0',
    authors: ['Antonio Alcántara', 'Ana Navarro']
  },
  measures: {},
  validationSchema: z
    .object({
      user_code: z.string().min(1, 'El código del usuario es obligatorio'),
      followup_date: requiredManualDateSchema(),
      eq5d_mobility: responseSchema,
      eq5d_selfcare: responseSchema,
      eq5d_activities: responseSchema,
      eq5d_pain: responseSchema,
      eq5d_anxiety: responseSchema,
      eq5d_vas: z.coerce.number().min(0).max(100),
      sleep_onset: responseSchema,
      sleep_maintenance: responseSchema,
      sleep_quality: responseSchema,
      sleep_daytime: responseSchema,
      mmas_forget: z.enum(['si', 'no']),
      mmas_remember: z.enum(['si', 'no']),
      mmas_better: z.enum(['si', 'no']),
      mmas_worse: z.enum(['si', 'no']),
      cgi_improvement: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']),
      objective_achieved: z.enum(['si', 'no']),
      dose_change: z.enum(['si', 'no']),
      dose_change_date: optionalManualDateSchema(),
      new_dose: z.number().optional(),
      adverse_events: z.enum(['si', 'no']),
      _pharmacovigilance_instruction: z.any().optional(),
      end_date: requiredManualDateSchema(),
      study_completed: z.enum(['si', 'no']),
      reason_not_completed: z.enum(['investigator', 'patient', 'other']).optional(),
      reason_not_completed_other: z.string().optional(),
      professional_attestation: z.boolean().refine((value) => value === true, {
        message: 'Debe confirmar la validación del formulario'
      })
    })
    .superRefine((data, context) => {
      if (data.dose_change === 'si' && (!data.dose_change_date || data.new_dose === undefined)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Complete la fecha y la nueva dosis',
          path: ['dose_change_date']
        });
      }
      if (data.study_completed === 'no' && !data.reason_not_completed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Indique el motivo', path: ['reason_not_completed'] });
      }
      if (data.reason_not_completed === 'other' && !data.reason_not_completed_other?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Especifique el motivo',
          path: ['reason_not_completed_other']
        });
      }
    })
});
