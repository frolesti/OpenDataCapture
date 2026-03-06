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

const centrosSanitariosOptions = {
  'CAP Badia (Barcelona)': 'CAP Badia (Barcelona)',
  'CAP Numància (Barcelona)': 'CAP Numància (Barcelona)',
  'CAP Sant Martí (Barcelona)': 'CAP Sant Martí (Barcelona)',
  'CAP Manso (Barcelona)': 'CAP Manso (Barcelona)',
  'CS Alhama de Granada (Granada)': 'CS Alhama de Granada (Granada)',
  'CS Aguadulce Sur (Almería)': 'CS Aguadulce Sur (Almería)',
  'CS Maria Fuensanta Pérez Quirós (Sevilla)': 'CS Maria Fuensanta Pérez Quirós (Sevilla)',
  'CS Brújula (Madrid)': 'CS Brújula (Madrid)',
  'CS Juncal (Torrejón de Ardoz)': 'CS Juncal (Torrejón de Ardoz)',
  'CS Ensanche (Vallecas)': 'CS Ensanche (Vallecas)',
  'Cons Alovera (Guadalajara)': 'Cons Alovera (Guadalajara)',
  'CS Gandhi (Madrid)': 'CS Gandhi (Madrid)',
  'CS Aravaca (Madrid)': 'CS Aravaca (Madrid)',
  'Cons Fontaras (Valencia)': 'Cons Fontaras (Valencia)',
  'CS Vinarós (Castellón)': 'CS Vinarós (Castellón)',
  'Cons Almenara Playa (Sagunto)': 'Cons Almenara Playa (Sagunto)',
  'CS Arturo Eiryes (Valladolid)': 'CS Arturo Eiryes (Valladolid)',
  'CS Antonio Gutierrez (León)': 'CS Antonio Gutierrez (León)',
  'CS Tortola (Valladolid)': 'CS Tortola (Valladolid)',
  'CS José Aguado (León)': 'CS José Aguado (León)',
  'CS Ávila Norte (Ávila)': 'CS Ávila Norte (Ávila)',
  'CS Vitoria (Salamanca)': 'CS Vitoria (Salamanca)',
  'CS Alfonso Sánchez Montero (Salamanca)': 'CS Alfonso Sánchez Montero (Salamanca)',
  'CS Xunqueira de Ambia (Orense)': 'CS Xunqueira de Ambia (Orense)',
  'CS Casco Vello (Pontevedra)': 'CS Casco Vello (Pontevedra)',
  'CS Elviña (A Coruña)': 'CS Elviña (A Coruña)',
  'CS Culleredo (A Coruña)': 'CS Culleredo (A Coruña)',
  'CS Montealto La Torre (A Coruña)': 'CS Montealto La Torre (A Coruña)',
  'CS Marín (Pontevedra)': 'CS Marín (Pontevedra)'
};

// Helper function to make a field conditional on osteoporosis diagnosis
function requiresDiagnosis<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', 'diag'] as const,
    render(data: any): any {
      if (data.informed_consent === 'si' && data.diag === 'si') {
        return field;
      }
      return null;
    }
  };
}

// Helper function to show "Continúa" field only if "¿Lo ha recibido?" is "si"
function requiresRecibido<T extends Record<string, any>>(field: T, treatmentName: string): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', treatmentName] as const,
    render(data: any): any {
      if (data.informed_consent === 'si' && data[treatmentName] === 'si') {
        return field;
      }
      return null;
    }
  };
}

// Helper function to show fields only if study was NOT completed
function requiresStudyNotCompleted<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', 'study_completion'] as const,
    render(data: any): any {
      if (data.informed_consent === 'si' && data.study_completion === 'no') {
        return field;
      }
      return null;
    }
  };
}

// Helper function to show "Otro motivo especificar" only if "otro" is selected
function requiresOtroMotivo<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', 'study_completion', 'reason_not_completed'] as const,
    render(data: any): any {
      if (data.informed_consent === 'si' && data.study_completion === 'no' && data.reason_not_completed === 'otro') {
        return field;
      }
      return null;
    }
  };
}

// Helper function to show fracture N only if user wants to add it
function requiresPreviousFracture<T extends Record<string, any>>(field: T, fractureNumber: number): any {
  return {
    kind: 'dynamic',
    deps: [
      'informed_consent',
      fractureNumber === 1 ? 'frac_rec_date_1' : `frac_rec_date_${fractureNumber - 1}`,
      fractureNumber === 1 ? undefined : `frac_rec_loc_${fractureNumber - 1}`,
      fractureNumber === 1 ? undefined : `frac_rec_hosp_${fractureNumber - 1}`,
      fractureNumber === 1 ? undefined : `add_frac_${fractureNumber}`
    ].filter(Boolean),
    render(data: Record<string, any>): any {
      if (fractureNumber === 1) {
        // La localització i hospitalització només es mostren si la data està informada
        if (field.label && (field.label.includes('Localización') || field.label.includes('hospitalización'))) {
          if (data['informed_consent'] === 'si' && data['frac_rec_date_1']) {
            return field;
          }
          return null;
        }
        // La data sempre es mostra si hi ha consentiment
        if (data['informed_consent'] === 'si') {
          return field;
        }
        return null;
      }

      // For subsequent fractures, check if:
      // 1. Previous fracture is completed (all 3 fields)
      // 2. User wants to add this fracture
      const prevFechaKey = `frac_rec_date_${fractureNumber - 1}`;
      const prevLocalizacionKey = `frac_rec_loc_${fractureNumber - 1}`;
      const prevHospitalizacionKey = `frac_rec_hosp_${fractureNumber - 1}`;
      const agregarKey = `add_frac_${fractureNumber}`;

      const isPreviousComplete = data[prevFechaKey] && data[prevLocalizacionKey] && data[prevHospitalizacionKey];

      // Show if previous is complete AND user said yes to adding this fracture
      if (data['informed_consent'] === 'si' && isPreviousComplete && data[agregarKey] === 'si') {
        return field;
      }

      return null;
    }
  };
}

// Helper function to show "Add another fracture?" button after each complete fracture
function showAddFractureButton(fractureNumber: number): any {
  return {
    kind: 'dynamic',
    deps: [
      'informed_consent',
      `frac_rec_date_${fractureNumber}`,
      `frac_rec_loc_${fractureNumber}`,
      `frac_rec_hosp_${fractureNumber}`
    ],
    render(data: Record<string, any>): any {
      const fechaKey = `frac_rec_date_${fractureNumber}`;
      const localizacionKey = `frac_rec_loc_${fractureNumber}`;
      const frac_rec_hospKey = `frac_rec_hosp_${fractureNumber}`;

      // Show button only if current fracture is complete
      const isCurrentComplete = data[fechaKey] && data[localizacionKey] && data[frac_rec_hospKey];

      if (data['informed_consent'] === 'si' && isCurrentComplete && fractureNumber < 6) {
        return {
          kind: 'string',
          label: `¿Desea agregar ${fractureNumber === 1 ? 'una segunda' : fractureNumber === 2 ? 'una tercera' : fractureNumber === 3 ? 'una cuarta' : fractureNumber === 4 ? 'una quinta' : 'una sexta'} fractura por fragilidad? *`,
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        };
      }

      return null;
    }
  };
}

// Helper function to check if medication treatment N is complete
function isMedicationTreatmentComplete(data: any, medicationName: string, treatmentNumber: number): boolean {
  const fechaInicioKey = `${medicationName}_ini_date_${treatmentNumber}`;
  const continuaKey = `${medicationName}_cont_${treatmentNumber}`;

  // Treatment is complete if it has a start date and either:
  // - continues (continua = 'si'), OR
  // - has been discontinued with end date and reason (continua = 'no')
  if (!data[fechaInicioKey]) {
    return false;
  }

  if (data[continuaKey] === 'si') {
    return true;
  }

  if (data[continuaKey] === 'no') {
    const fechaFinKey = `${medicationName}_end_date_${treatmentNumber}`;
    const motivoKey = `${medicationName}_reason_end_${treatmentNumber}`;
    return !!(data[fechaFinKey] && data[motivoKey]);
  }

  // If `continua` is not explicitly set but start date exists, consider the
  // treatment complete (i.e. no further mandatory fields) unless there is an
  // explicit end date+reason. This makes the UI tolerant when users provide
  // a single treatment with a start date but don't fill the 'continúa' radio.
  if (data[fechaInicioKey]) {
    const fechaFinKey = `${medicationName}_end_date_${treatmentNumber}`;
    const motivoKey = `${medicationName}_reason_end_${treatmentNumber}`;
    // If there is an end date + reason then treatment is complete; otherwise
    // assume ongoing (complete enough for our purposes).
    return !(data[fechaFinKey] && !data[motivoKey]);
  }

  return false;
}

// Helper function to show "Add another treatment?" button for medications
function showAddMedicationButton(medicationName: string, medicationLabel: string, treatmentNumber: number): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `${medicationName}_ini_date_${treatmentNumber}`,
      `${medicationName}_cont_${treatmentNumber}`,
      `${medicationName}_end_date_${treatmentNumber}`,
      `${medicationName}_reason_end_${treatmentNumber}`
    ] as const,
    render(data: any): any {
      const fechaInicioKey = `${medicationName}_ini_date_${treatmentNumber}`;
      const continuaKey = `${medicationName}_cont_${treatmentNumber}`;
      const fechaFinKey = `${medicationName}_end_date_${treatmentNumber}`;
      const motivoKey = `${medicationName}_reason_end_${treatmentNumber}`;

      // Only show "Add another treatment?" if the treatment has ended (continua = 'no' and has end date + reason)
      if (
        data.informed_consent === 'si' &&
        data[fechaInicioKey] &&
        data[continuaKey] === 'no' &&
        data[fechaFinKey] &&
        data[motivoKey]
      ) {
        return {
          kind: 'string' as const,
          label: `¿Desea agregar ${treatmentNumber === 1 ? 'un segundo' : treatmentNumber === 2 ? 'un tercer' : 'otro'} tratamiento de ${medicationLabel}? *`,
          variant: 'radio' as const,
          options: {
            si: 'Sí',
            no: 'No'
          }
        };
      }
      return null;
    }
  };
}

// Helper function to show medication treatment N fields based on "Add treatment?" answer
function requiresPreviousMedicationTreatment<T extends Record<string, any>>(
  field: T,
  medicationName: string,
  treatmentNumber: number
): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `${medicationName}_ini_date_${treatmentNumber - 1}`,
      `${medicationName}_cont_${treatmentNumber - 1}`,
      `${medicationName}_end_date_${treatmentNumber - 1}`,
      `${medicationName}_reason_end_${treatmentNumber - 1}`,
      `add_${medicationName}_${treatmentNumber}`
    ] as const,
    render(data: any): any {
      if (treatmentNumber === 1) {
        // First treatment always shows if consent is given
        if (data.informed_consent === 'si') {
          return field;
        }
        return null;
      }

      // For subsequent treatments, check if:
      // 1. Previous treatment is completed
      // 2. User wants to add this treatment
      const agregarKey = `add_${medicationName}_${treatmentNumber}`;
      const isPreviousComplete = isMedicationTreatmentComplete(data, medicationName, treatmentNumber - 1);

      if (data.informed_consent === 'si' && isPreviousComplete && data[agregarKey] === 'si') {
        return field;
      }

      return null;
    }
  };
}

// Helper function for medication "Continua" field - requires start date
function requiresMedicationStartDate<T extends Record<string, any>>(
  field: T,
  medicationName: string,
  treatmentNumber: number
): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent', `${medicationName}_ini_date_${treatmentNumber}`] as const,
    render(data: any): any {
      const startDateKey = `${medicationName}_ini_date_${treatmentNumber}`;
      if (data.informed_consent === 'si' && data[startDateKey]) {
        return field;
      }
      return null;
    }
  };
}

// Helper function for medication end date and reason - requires discontinuation
function requiresMedicationDiscontinuation<T extends Record<string, any>>(
  field: T,
  medicationName: string,
  treatmentNumber: number
): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `${medicationName}_ini_date_${treatmentNumber}`,
      `${medicationName}_cont_${treatmentNumber}`
    ] as const,
    render(data: any): any {
      const startDateKey = `${medicationName}_ini_date_${treatmentNumber}`;
      const continuaKey = `${medicationName}_cont_${treatmentNumber}`;
      if (data.informed_consent === 'si' && data[startDateKey] && data[continuaKey] === 'no') {
        return field;
      }
      return null;
    }
  };
}

// Function to generate medication fields for multiple treatments (up to 3)
function generateMedicationFields(medicationName: string, medicationLabel: string, maxTreatments: number = 3) {
  const fields: Record<string, any> = {};

  const motivoOptions = {
    tolerabilidad: 'Problemas de tolerabilidad',
    eficacia: 'Falta de eficacia',
    incumplimiento: 'Incumplimiento',
    cirugias: 'Procedimientos o cirugías dentales',
    investigador: 'Decisión del investigador',
    especialista: 'Decisión del especialista',
    sujeto: 'Decisión del sujeto',
    otros: 'Otros'
  };

  for (let i = 1; i <= maxTreatments; i++) {
    const treatmentLabel = i === 1 ? medicationLabel : `${medicationLabel} (tratamiento ${i})`;

    // Fecha inicio
    fields[`${medicationName}_ini_date_${i}`] = requiresPreviousMedicationTreatment(
      {
        kind: 'string',
        variant: 'input',
        placeholder: 'DD-MM-YYYY',
        label: `${treatmentLabel} - Fecha inicio (DD-MM-YYYY)`
      },
      medicationName,
      i
    );

    // Continúa
    fields[`${medicationName}_cont_${i}`] = requiresMedicationStartDate(
      {
        kind: 'string',
        label: `${treatmentLabel} - Continúa *`,
        variant: 'radio',
        options: {
          si: 'Sí',
          no: 'No'
        }
      },
      medicationName,
      i
    );

    // Fecha fin
    fields[`${medicationName}_end_date_${i}`] = requiresMedicationDiscontinuation(
      {
        kind: 'string',
        variant: 'input',
        placeholder: 'DD-MM-YYYY',
        label: `${treatmentLabel} - Fecha fin (DD-MM-YYYY)`
      },
      medicationName,
      i
    );

    // Motivo interrupción
    fields[`${medicationName}_reason_end_${i}`] = requiresMedicationDiscontinuation(
      {
        kind: 'string',
        label: `${treatmentLabel} - Motivo interrupción`,
        variant: 'select',
        options: motivoOptions
      },
      medicationName,
      i
    );

    // Add treatment button (including after the last treatment to trigger additional details)
    fields[`add_${medicationName}_${i + 1}`] = showAddMedicationButton(medicationName, medicationLabel, i);
  }

  // Add open text field for details if more than 3 treatments
  fields[`${medicationName}_additional_details`] = {
    kind: 'dynamic' as const,
    deps: ['informed_consent', `add_${medicationName}_${maxTreatments + 1}`] as const,
    render(data: any): any {
      const addKey = `add_${medicationName}_${maxTreatments + 1}`;

      if (data.informed_consent === 'si' && data[addKey] === 'si') {
        return {
          kind: 'string',
          variant: 'textarea',
          label: `En caso de que tenga más de tres tratamientos de ${medicationLabel}, especifique la fecha de inicio, si continua o no (en caso que no continúe, fecha de fin y motivo de interrupción de todas las pautas que tenga del fármaco) a continuación`,
          rows: 3
        };
      }
      return null;
    }
  };

  return fields;
}

// Helper to validate real calendar dates (e.g. rejects 30-02-2025)
const isValidDate = (val: string | undefined) => {
  if (!val) return true;
  const [day, month, year] = val.split('-').map(Number);
  if (day === undefined || month === undefined || year === undefined) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

// Function to generate medication validation schemas for multiple treatments
function generateMedicationValidationSchemas(medicationName: string, maxTreatments: number = 3) {
  const schemas: Record<string, any> = {};

  const motivoEnum = z.enum([
    'tolerabilidad',
    'eficacia',
    'incumplimiento',
    'cirugias',
    'investigador',
    'especialista',
    'sujeto',
    'otros'
  ]);

  for (let i = 1; i <= maxTreatments; i++) {
    schemas[`${medicationName}_ini_date_${i}`] = z
      .string()
      .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
      .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
      .or(z.literal(''))
      .optional();

    schemas[`${medicationName}_cont_${i}`] = z.enum(['si', 'no']).optional();

    schemas[`${medicationName}_end_date_${i}`] = z
      .string()
      .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
      .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
      .or(z.literal(''))
      .optional();
    schemas[`${medicationName}_reason_end_${i}`] = motivoEnum.optional();

    // Field to add next treatment (or additional details for the last one)
    // Default to 'no' so that if the UI shows the question but the user
    // doesn't select an option, validation assumes 'no' (avoids ghost required errors).
    schemas[`add_${medicationName}_${i + 1}`] = z
      .enum(['si', 'no', ''])
      .transform((v) => (v === '' ? undefined : v))
      .optional();
  }

  schemas[`${medicationName}_additional_details`] = z.string().optional();

  return schemas;
}

// Custom field name mappings for export
export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Osteoporosis', 'Primary Care'],
  internal: {
    edition: 22,
    name: 'OMEGA_FF_AP_2025'
  },
  content: [
    {
      title: 'CUADERNO DE RECOGIDA DE DATOS',
      description:
        'Evaluación del tratamiento antiosteoporótico posterior a fractura por fragilidad en Atención Primaria: estudio transversal',
      fields: {}
    },
    {
      title: 'CÓDIGO DEL PACIENTE',
      fields: {
        patientID: {
          kind: 'string',
          variant: 'input',
          label:
            'Introduzca el código único asignado al paciente en su centro. Este código se utilizará para identificar de manera anónima los datos del paciente *'
        }
      }
    },
    {
      title: 'Consentimiento informado',
      fields: {
        informed_consent: {
          kind: 'string',
          variant: 'radio',
          label: '¿El paciente ha firmado el consentimiento informado? *',
          options: {
            si: 'Sí',
            no: 'No'
          } as any
        } as any,
        consent_date: {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: 'Fecha de obtención del consentimiento informado firmado (DD-MM-YYYY) *',
          description: 'Fecha en la que el paciente firma el consentimiento informado'
        }
      }
    },
    {
      title: 'CRITERIOS DE INCLUSIÓN',
      description: 'Todos los criterios de inclusión deben ser SÍ para que el paciente sea apto para el estudio',
      fields: {
        _warningCriteriosSeleccion: consentWarning() as any,
        inclusion_criteria_1: requiresConsent({
          kind: 'string',
          label:
            '1. Adultos ≥ 50 años, con antecedentes de historia de al menos una fractura por fragilidad (evento índice) (ICD Código ICD-9 y ICD-10) ocurrida entre enero de 2021 y diciembre de 2025 *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        } as any) as any,
        inclusion_criteria_2: requiresConsent({
          kind: 'string',
          label:
            '2. Los pacientes deben haber otorgado su consentimiento informado para la recopilación y el uso de los datos clínicos contenidos en su historia médica *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        })
      }
    },
    {
      title: 'CRITERIOS DE EXCLUSIÓN',
      description: 'Todos los criterios de exclusión deben ser NO para que el paciente sea apto para el estudio',
      fields: {
        _warningExclusionStart: consentWarning() as any,
        exclusion_criteria_1: requiresConsent({
          kind: 'string',
          label: '1. Pacientes sin otorgar el consentimiento informado *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        exclusion_criteria_2: requiresConsent({
          kind: 'string',
          label:
            '2. Pacientes cuya historia clínica presenta documentación incompleta o carece de información relevante necesaria para la correcta valoración de los resultados del estudio *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        exclusion_criteria_3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes con una fractura debido a un traumatismo de alta a moderada intensidad (ej. accidente automóvil) y otras fracturas poco probables de estar relacionadas con la osteoporosis (dedos de las manos y pies y huesos de la cara) *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        exclusion_criteria_4: requiresConsent({
          kind: 'string',
          label: '4. Participación previa en otro estudio en el último año *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        _warningExclusionCriteria: {
          kind: 'dynamic' as const,
          deps: [
            'inclusion_criteria_1',
            'inclusion_criteria_2',
            'exclusion_criteria_1',
            'exclusion_criteria_2',
            'exclusion_criteria_3',
            'exclusion_criteria_4'
          ] as const,
          render(data: any) {
            const inclusionFailed = data.inclusion_criteria_1 === 'no' || data.inclusion_criteria_2 === 'no';
            const exclusionFailed =
              data.exclusion_criteria_1 === 'si' ||
              data.exclusion_criteria_2 === 'si' ||
              data.exclusion_criteria_3 === 'si' ||
              data.exclusion_criteria_4 === 'si';

            if (inclusionFailed || exclusionFailed) {
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
      title: 'CARACTERIZACIÓN DEL PACIENTE EN EL MOMENTO DE LA FRACTURA ÍNDICE',
      description:
        'Centro de Atención Primaria y datos demográficos y clínicos en el momento de la fractura por fragilidad índice',
      fields: {
        _warningCaracterizacion: consentWarning() as any,
        CAP: requiresConsent({
          kind: 'string',
          label: '¿Cuál es el centro de atención primaria dónde se visita el paciente? *',
          variant: 'select',
          options: centrosSanitariosOptions
        }),
        sex: requiresConsent({
          kind: 'string',
          label: 'Indique el sexo del paciente *',
          variant: 'radio',
          options: {
            masculino: 'Masculino',
            femenino: 'Femenino'
          }
        }),
        age: requiresConsent({
          kind: 'number',
          label: 'Indique la edad del paciente (años) *',
          variant: 'input'
        }),
        weight: requiresConsent({
          kind: 'number',
          label: 'Indique el peso (kg) (utilice punto "." para los decimales) *',
          variant: 'input'
        }),
        height: requiresConsent({
          kind: 'number',
          label: 'Indique la altura (cm) (utilice punto "." para los decimales) *',
          variant: 'input'
        }),
        cifosis: requiresConsent({
          kind: 'string',
          label: '¿Se observa cifosis? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        height_loss: requiresConsent({
          kind: 'string',
          label: '¿Existe pérdida de altura documentada RECIENTE respecto a talla previa? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        lifestyle: requiresConsent({
          kind: 'string',
          label: 'Indique el estilo de vida que se ajuste más al paciente *',
          variant: 'radio',
          options: {
            sedentario: 'Estilo de vida sedentario',
            activo: 'Estilo de vida activo',
            equilibrado: 'Estilo de vida equilibrado',
            riesgo: 'Estilo de vida con hábitos de riesgo'
          }
        })
      }
    },
    {
      title: 'FACTORES DE RIESGO (en el momento de la fractura por fragilidad índice)',
      description: 'Indique si el paciente presenta alguno de los siguientes factores de riesgo',
      fields: {
        _warningFactoresRiesgo: consentWarning() as any,
        RF_IMCm20: requiresConsent({
          kind: 'boolean',
          label: 'IMC (< 20 kg/m²)',
          variant: 'checkbox'
        }),
        RF_ethnicity: requiresConsent({
          kind: 'boolean',
          label: 'Etnicidad (paciente blanco/a caucásico/a)',
          variant: 'checkbox'
        }),
        RF_early_menopause: requiresConsent({
          kind: 'boolean',
          label: 'Menopausia precoz (<45 años)',
          variant: 'checkbox'
        }),
        RF_prev_frac: requiresConsent({
          kind: 'boolean',
          label: 'Fractura previa',
          variant: 'checkbox'
        }),
        RF_hist_fem_frac: requiresConsent({
          kind: 'boolean',
          label: 'Antecedente paterno/materno de fractura femoral',
          variant: 'checkbox'
        }),
        RF_smoking: requiresConsent({
          kind: 'boolean',
          label: 'Tabaquismo activo',
          variant: 'checkbox'
        }),
        RF_alcohol: requiresConsent({
          kind: 'boolean',
          label: 'Ingesta de alcohol ≥3 unidades/día',
          variant: 'checkbox'
        }),
        RF_poor_nutrition: requiresConsent({
          kind: 'boolean',
          label:
            'Nutrición pobre - dieta baja en calcio (definiéndose como ingesta baja en calcio un aporte de < 3 unidades de calcio diarias; siendo 1 vaso de leche, 1 yogur o 40 g de queso 1 unidad)',
          variant: 'checkbox'
        }),
        RF_assoc_medications: requiresConsent({
          kind: 'boolean',
          label:
            'Medicamentos asociados (glucocorticoides orales, inhibidores de la aromatasa, análogos de la GnRH, anticonvulsivos, inhibidores de la bomba de protones, fármacos antihipertensivos y estatinas)',
          variant: 'checkbox'
        })
      }
    },
    {
      title: 'COMORBILIDADES (en el momento de la fractura por fragilidad índice)',
      description: 'Indique si el paciente presenta alguna de las siguientes comorbilidades',
      fields: {
        _warningComorbilidades: consentWarning() as any,
        com_rheum_arthritis: requiresConsent({
          kind: 'boolean',
          label: 'Artritis reumatoide',
          variant: 'checkbox'
        }),
        com_other_inflam_arthritis: requiresConsent({
          kind: 'boolean',
          label: 'Otras artritis inflamatorias',
          variant: 'checkbox'
        }),
        com_lupus: requiresConsent({
          kind: 'boolean',
          label: 'Lupus eritematoso sistémico',
          variant: 'checkbox'
        }),
        com_hyperparathyroidism: requiresConsent({
          kind: 'boolean',
          label: 'Hiperparatiroidismo',
          variant: 'checkbox'
        }),
        com_hyperthyroidism: requiresConsent({
          kind: 'boolean',
          label: 'Hipertiroidismo',
          variant: 'checkbox'
        }),
        com_hypercortisolism: requiresConsent({
          kind: 'boolean',
          label: 'Hipercortisolismo/Cushing',
          variant: 'checkbox'
        }),
        com_diabetes: requiresConsent({
          kind: 'boolean',
          label: 'Diabetes (tipos 1 y 2)',
          variant: 'checkbox'
        }),
        com_inflam_bowel: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad inflamatoria intestinal',
          variant: 'checkbox'
        }),
        com_malnutrition: requiresConsent({
          kind: 'boolean',
          label: 'Malnutrición',
          variant: 'checkbox'
        }),
        com_parent_nutrition: requiresConsent({
          kind: 'boolean',
          label: 'Nutrición parenteral',
          variant: 'checkbox'
        }),
        com_myeloma: requiresConsent({
          kind: 'boolean',
          label: 'Mieloma múltiple',
          variant: 'checkbox'
        }),
        com_other_spinal_cord: requiresConsent({
          kind: 'boolean',
          label: 'Otros trastornos medulares',
          variant: 'checkbox'
        }),
        com_COPD: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad pulmonar obstructiva crónica (EPOC)',
          variant: 'checkbox'
        }),
        com_CKD: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad renal crónica (ERC)',
          variant: 'checkbox'
        })
      }
    },
    {
      title: 'EPISODIO DE LA FRACTURA POR FRAGILIDAD',
      description:
        'Complete la información de cada fractura por fragilidad reciente del paciente. Después de completar una fractura, podrá elegir si desea agregar otra.',
      fields: {
        _warningFractura: consentWarning() as any,
        // Primera fractura
        frac_rec_date_1: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la Fractura por Fragilidad (DD-MM-YYYY)'
          },
          1
        ),
        frac_rec_loc_1: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          1
        ),
        frac_rec_hosp_1: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización?',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          1
        ),
        add_frac_2: showAddFractureButton(1),
        // Segunda fractura
        frac_rec_date_2: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la FF (segunda fractura por fragilidad) (DD-MM-YYYY)'
          },
          2
        ),
        frac_rec_loc_2: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          2
        ),
        frac_rec_hosp_2: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? (segunda fractura)',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          2
        ),
        add_frac_3: showAddFractureButton(2),
        // Tercera fractura
        frac_rec_date_3: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la FF (tercera fractura por fragilidad) (DD-MM-YYYY)'
          },
          3
        ),
        frac_rec_loc_3: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          3
        ),
        frac_rec_hosp_3: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? (tercera fractura)',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          3
        ),
        add_frac_4: showAddFractureButton(3),
        // Cuarta fractura
        frac_rec_date_4: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la FF (cuarta fractura por fragilidad) (DD-MM-YYYY)'
          },
          4
        ),
        frac_rec_loc_4: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          4
        ),
        frac_rec_hosp_4: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? (cuarta fractura)',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          4
        ),
        add_frac_5: showAddFractureButton(4),
        // Quinta fractura
        frac_rec_date_5: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la FF (quinta fractura por fragilidad) (DD-MM-YYYY)'
          },
          5
        ),
        frac_rec_loc_5: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          5
        ),
        frac_rec_hosp_5: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? (quinta fractura)',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          5
        ),
        add_frac_6: showAddFractureButton(5),
        // Sexta fractura
        frac_rec_date_6: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la FF (sexta fractura por fragilidad) (DD-MM-YYYY)'
          },
          6
        ),
        frac_rec_loc_6: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneca: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          6
        ),
        frac_rec_hosp_6: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? (sexta fractura)',
            variant: 'select',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          6
        )
      }
    },
    {
      title: 'DIAGNÓSTICO DE OSTEOPOROSIS',
      fields: {
        _warningDiagnostico: consentWarning() as any,
        diag: requiresConsent({
          kind: 'string',
          label: '¿El paciente está diagnosticado de osteoporosis? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        diag_date: requiresDiagnosis({
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: '¿Cuál fue la fecha en la que tuvo lugar el diagnóstico? (DD-MM-YYYY) *'
        }),
        diag_method: requiresDiagnosis({
          kind: 'string',
          label: '¿Qué método principal se empleó para el diagnóstico? *',
          variant: 'radio',
          options: {
            dxa: 'Densitometría ósea (DXA)',
            clinico: 'Diagnóstico clínico tras fractura por fragilidad (sin DXA)',
            frax: 'Evaluación de riesgo mediante FRAX u otra escala sin DXA',
            hallazgo: 'Hallazgo radiológico de fracturas',
            presuntivo: 'Diagnóstico presuntivo por antecedentes y factores de riesgo',
            otro: 'Otro'
          }
        }),
        diag_method_other: {
          kind: 'dynamic' as const,
          deps: ['diag', 'diag_method'] as const,
          render(data: any) {
            if (data.diag === 'si' && data.diag_method === 'otro') {
              return {
                kind: 'string' as const,
                label: 'Otro (especificar):',
                variant: 'input' as const
              };
            }
            return null;
          }
        },
        tscore_columna_total: {
          kind: 'dynamic' as const,
          deps: ['diag', 'diag_method'] as const,
          render(data: any) {
            if (data.diag === 'si' && data.diag_method === 'dxa') {
              return {
                kind: 'string' as const,
                label: 'T-score columna total',
                variant: 'input' as const,
                description: 'Indique el valor de T-score de columna total'
              };
            }
            return null;
          }
        },
        tscore_femur_total: {
          kind: 'dynamic' as const,
          deps: ['diag', 'diag_method'] as const,
          render(data: any) {
            if (data.diag === 'si' && data.diag_method === 'dxa') {
              return {
                kind: 'string' as const,
                label: 'T-score fémur total / cuello femoral',
                variant: 'input' as const,
                description: 'Indique el valor de T-score de fémur total o cuello femoral'
              };
            }
            return null;
          }
        }
      }
    },
    {
      title: 'PRESCRIPCIÓN DEL TRATAMIENTO DE OSTEOPOROSIS',
      description:
        'MEDICACIÓN OSTEOPOROSIS. Indique los tratamientos que el paciente ha recibido para la osteoporosis y la duración de cada uno de ellos: Si continúa con la medicación no rellene la fecha fin y marque la casilla “continúa”. Si no continúa, complete el“motivo de interrupción de la medicación”. Cuando proceda, dentro de cada medicación, introduzca los tratamientos en orden cronológico, desde el más antiguo hasta el más reciente.',
      fields: {
        _warningTratamiento: consentWarning() as any,
        // All medications with up to 3 treatments each
        ...generateMedicationFields('alend', 'Alendronato'),
        ...generateMedicationFields('risedr', 'Risedronato'),
        ...generateMedicationFields('iban', 'Ibandronato'),
        ...generateMedicationFields('zoled', 'Zoledronato'),
        ...generateMedicationFields('denos', 'Denosumab'),
        ...generateMedicationFields('ralox', 'Raloxifeno'),
        ...generateMedicationFields('bazed', 'Bazedoxifeno'),
        ...generateMedicationFields('tibol', 'Tibolona'),
        ...generateMedicationFields('terip', 'Teriparatida'),
        ...generateMedicationFields('abal', 'Abaloparatida'),
        ...generateMedicationFields('romo', 'Romosozumab')
      }
    },
    {
      title: 'TRATAMIENTO NO FARMACOLÓGICO OSTEOPOROSIS',
      description:
        'Indique los tratamientos no farmacológicos que el paciente ha recibido para la osteoporosis . Además, en aquellos en los que aplique, indique si actualmente continúa con ellos:',
      fields: {
        _warningTratamientoNoFarmacologico: consentWarning() as any,
        NPT_exercise: requiresConsent({
          kind: 'string',
          label: 'Ejercicio físico - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        NPT_exercise_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Ejercicio físico - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'NPT_exercise'
        ),
        NPT_calcium_vitaminD: requiresConsent({
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        NPT_calcium_vitaminD_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Suplementos de calcio / vitamina D - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'NPT_calcium_vitaminD'
        ),
        NPT_quit_smoking: requiresConsent({
          kind: 'string',
          label: 'Consejo antitabáquico - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        NPT_quit_smoking_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Consejo antitabáquico - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'NPT_quit_smoking'
        ),
        NPT_alcohol_reduction: requiresConsent({
          kind: 'string',
          label: 'Reducción de consumo de alcohol - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        NPT_alcohol_reduction_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Reducción de consumo de alcohol - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'NPT_alcohol_reduction'
        ),
        NPT_hip_protectors: requiresConsent({
          kind: 'string',
          label: 'Protectores de cadera - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        NPT_hip_protectors_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Protectores de cadera - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'NPT_hip_protectors'
        ),
        other_treatment: requiresConsent({
          kind: 'string',
          label: 'Otros',
          variant: 'input'
        })
      }
    },
    {
      title: 'FORMULARIO FIN DE ESTUDIO',
      fields: {
        _warningFinEstudio: consentWarning() as any,
        date_end_study: requiresConsent({
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: '¿Fecha en que se rellena el formulario de fin de estudio? (DD-MM-YYYY) *'
        }),
        study_completion: requiresConsent({
          kind: 'string',
          label: '¿Ha completado el paciente el estudio? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        reason_not_completed: requiresStudyNotCompleted({
          kind: 'string',
          label: 'En caso negativo, indique el motivo *',
          variant: 'radio',
          options: {
            decisionInvestigador: 'Decisión del investigador',
            decisionPaciente: 'Decisión del paciente',
            otro: 'Otro'
          }
        }),
        reason_not_completed_other: requiresOtroMotivo({
          kind: 'string',
          label: 'Otro motivo (especificar): *',
          variant: 'input'
        }),
        Investigator_initials: requiresConsent({
          kind: 'string',
          label: 'Iniciales del investigador *',
          variant: 'input'
        })
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 45,
    instructions: [
      'IMPORTANTE: Antes de comenzar, asegúrese de tener a mano TODOS los datos clínicos del paciente necesarios para completar el formulario.\n Revise el formulario compartido previamente en la sesión de formación para familiarizarse con todos los datos que se requerirán.\n Complete todos los campos del formulario con la información más precisa posible.\n Los campos marcados con * son obligatorios.\n Utilice las unidades de medida especificadas en cada campo.\n En caso de duda, consulte con el investigador principal.\n Asegúrese de verificar los datos antes de enviar el formulario.'
    ]
  },
  details: {
    description:
      'Evaluación del Tratamiento Antiosteoporótico Posterior a Fractura por Fragilidad en Atención Primaria: Estudio Transversal',
    title: 'OMEGA-FF-AP-2025',
    license: 'Apache-2.0',
    authors: ['Equipo de Investigación Osteoporosis']
  },
  measures: {
    cumple_criterios_inclusion: {
      kind: 'computed',
      label: 'Cumple Criterios de Inclusión',
      value: (data) => {
        return data.inclusion_criteria_1 && data.inclusion_criteria_2;
      }
    },
    cumple_criterios_exclusion: {
      kind: 'computed',
      label: 'Presenta Criterios de Exclusión',
      value: (data) => {
        return (
          data.exclusion_criteria_1 ||
          data.exclusion_criteria_2 ||
          data.exclusion_criteria_3 ||
          data.exclusion_criteria_4
        );
      }
    }
  },
  validationSchema: z
    .object({
      // WARNINGS (Dynamic fields)
      _warningCriteriosSeleccion: z.any().optional(),
      _warningExclusionStart: z.any().optional(),
      _warningExclusionCriteria: z.any().optional(),
      _warningCaracterizacion: z.any().optional(),
      _warningFactoresRiesgo: z.any().optional(),
      _warningComorbilidades: z.any().optional(),
      _warningFractura: z.any().optional(),
      _warningDiagnostico: z.any().optional(),
      _warningTratamiento: z.any().optional(),
      _warningTratamientoNoFarmacologico: z.any().optional(),
      _warningFinEstudio: z.any().optional(),

      // SELECCIÓN DEL PACIENTE
      patientID: z.string().min(1, 'El código del paciente es obligatorio'),
      informed_consent: z.enum(['si', 'no']).refine((val) => val === 'si', {
        message: 'El consentimiento informado debe ser Sí'
      }),
      consent_date: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)'),
      inclusion_criteria_1: z.enum(['si', 'no']),
      inclusion_criteria_2: z.enum(['si', 'no']),
      exclusion_criteria_1: z.enum(['si', 'no']),
      exclusion_criteria_2: z.enum(['si', 'no']),
      exclusion_criteria_3: z.enum(['si', 'no']),
      exclusion_criteria_4: z.enum(['si', 'no']),

      // CARACTERIZACIÓN DEL PACIENTE
      CAP: z.string().optional(),
      sex: z.enum(['masculino', 'femenino']).optional(),
      age: z
        .number()
        .min(50, 'La edad debe ser al menos 50 años')
        .max(120, 'La edad debe ser menor a 120 años')
        .optional(),
      weight: z
        .number()
        .min(1, 'El peso debe ser mayor a 0 kg')
        .max(300, 'El peso debe ser menor o igual a 300 kg')
        .optional(),
      height: z
        .number()
        .min(50, 'La altura debe ser al menos 50 cm')
        .max(250, 'La altura debe ser menor o igual a 250 cm')
        .optional(),
      cifosis: z.enum(['si', 'no']).optional(),
      height_loss: z.enum(['si', 'no']).optional(),
      lifestyle: z.enum(['sedentario', 'activo', 'equilibrado', 'riesgo']).optional(),
      presentaFactoresRiesgo: z.enum(['si', 'no']).optional(),
      RF_IMCm20: z.boolean().optional(),
      RF_ethnicity: z.boolean().optional(),
      RF_early_menopause: z.boolean().optional(),
      RF_prev_frac: z.boolean().optional(),
      RF_hist_fem_frac: z.boolean().optional(),
      RF_smoking: z.boolean().optional(),
      RF_alcohol: z.boolean().optional(),
      RF_poor_nutrition: z.boolean().optional(),
      RF_assoc_medications: z.boolean().optional(),

      // COMORBILIDADES
      com_rheum_arthritis: z.boolean().optional(),
      com_other_inflam_arthritis: z.boolean().optional(),
      com_lupus: z.boolean().optional(),
      com_hyperparathyroidism: z.boolean().optional(),
      com_hyperthyroidism: z.boolean().optional(),
      com_hypercortisolism: z.boolean().optional(),
      com_diabetes: z.boolean().optional(),
      com_inflam_bowel: z.boolean().optional(),
      com_malnutrition: z.boolean().optional(),
      com_parent_nutrition: z.boolean().optional(),
      com_myeloma: z.boolean().optional(),
      com_other_spinal_cord: z.boolean().optional(),
      com_COPD: z.boolean().optional(),
      com_CKD: z.boolean().optional(),

      // FRACTURA
      frac_rec_date_1: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .or(z.literal(''))
        .optional(),
      frac_rec_loc_1: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .or(z.literal(''))
        .optional(),
      frac_rec_hosp_1: z.enum(['si', 'no']).or(z.literal('')).optional(),
      add_frac_2: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      frac_rec_date_2: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_2: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_2: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      add_frac_3: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      frac_rec_date_3: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_3: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_3: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      add_frac_4: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      frac_rec_date_4: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_4: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_4: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      add_frac_5: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      frac_rec_date_5: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_5: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_5: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      add_frac_6: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
      frac_rec_date_6: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_6: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_6: z
        .enum(['si', 'no', ''])
        .transform((v) => (v === '' ? undefined : v))
        .optional(),

      // DIAGNÓSTICO
      diag: z.enum(['si', 'no']).optional(),
      diag_date: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      diag_method: z.enum(['dxa', 'clinico', 'frax', 'hallazgo', 'presuntivo', 'otro']).optional(),
      diag_method_other: z.string().optional(),
      tscore_columna_total: z.string().optional(),
      tscore_femur_total: z.string().optional(),

      // TRATAMIENTOS (todos opcionales)
      ...generateMedicationValidationSchemas('alend'),
      ...generateMedicationValidationSchemas('risedr'),
      ...generateMedicationValidationSchemas('iban'),
      ...generateMedicationValidationSchemas('zoled'),
      ...generateMedicationValidationSchemas('denos'),
      ...generateMedicationValidationSchemas('ralox'),
      ...generateMedicationValidationSchemas('bazed'),
      ...generateMedicationValidationSchemas('tibol'),
      ...generateMedicationValidationSchemas('terip'),
      ...generateMedicationValidationSchemas('abal'),
      ...generateMedicationValidationSchemas('romo'),

      // TRATAMIENTO NO FARMACOLÓGICO
      NPT_exercise: z.enum(['si', 'no']).optional(),
      NPT_exercise_cont: z.enum(['si', 'no']).optional(),
      NPT_calcium_vitaminD: z.enum(['si', 'no']).optional(),
      NPT_calcium_vitaminD_cont: z.enum(['si', 'no']).optional(),
      NPT_quit_smoking: z.enum(['si', 'no']).optional(),
      NPT_quit_smoking_cont: z.enum(['si', 'no']).optional(),
      NPT_alcohol_reduction: z.enum(['si', 'no']).optional(),
      NPT_alcohol_reduction_cont: z.enum(['si', 'no']).optional(),
      NPT_hip_protectors: z.enum(['si', 'no']).optional(),
      NPT_hip_protectors_cont: z.enum(['si', 'no']).optional(),
      other_treatment: z.string().optional(),

      // FIN DE ESTUDIO
      date_end_study: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      study_completion: z.enum(['si', 'no']).optional(),
      reason_not_completed: z.enum(['decisionInvestigador', 'decisionPaciente', 'otro']).optional(),
      reason_not_completed_other: z.string().optional(),
      Investigator_initials: z.string().optional()
    })
    .superRefine((data, ctx) => {
      // Validar campos obligatorios que tienen * en el label
      if (data.informed_consent === 'si') {
        const requiredFields = [
          'consent_date',
          'inclusion_criteria_1',
          'inclusion_criteria_2',
          'exclusion_criteria_1',
          'exclusion_criteria_2',
          'exclusion_criteria_3',
          'exclusion_criteria_4',
          'CAP',
          'sex',
          'age',
          'weight',
          'height',
          'cifosis',
          'height_loss',
          'lifestyle',
          'diag',
          'NPT_exercise',
          'NPT_calcium_vitaminD',
          'NPT_quit_smoking',
          'NPT_alcohol_reduction',
          'NPT_hip_protectors',
          'date_end_study',
          'study_completion',
          'Investigator_initials'
        ];

        for (const field of requiredFields) {
          const value = data[field as keyof typeof data];
          if (value === undefined || value === null || value === '') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: [field]
            });
          }
        }

        // Validar tratamientos no farmacológicos secundarios (Continúa)
        if (data.NPT_exercise === 'si' && !data.NPT_exercise_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['NPT_exercise_cont']
          });
        }
        if (data.NPT_calcium_vitaminD === 'si' && !data.NPT_calcium_vitaminD_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['NPT_calcium_vitaminD_cont']
          });
        }
        if (data.NPT_quit_smoking === 'si' && !data.NPT_quit_smoking_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['NPT_quit_smoking_cont']
          });
        }
        if (data.NPT_alcohol_reduction === 'si' && !data.NPT_alcohol_reduction_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['NPT_alcohol_reduction_cont']
          });
        }
        if (data.NPT_hip_protectors === 'si' && !data.NPT_hip_protectors_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['NPT_hip_protectors_cont']
          });
        }

        if (data.diag === 'si') {
          if (!data.diag_date)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['diag_date']
            });
          if (!data.diag_method)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['diag_method']
            });
        }

        if (data.study_completion === 'no') {
          if (!data.reason_not_completed)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['reason_not_completed']
            });
          if (data.reason_not_completed === 'otro' && !data.reason_not_completed_other) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['reason_not_completed_other']
            });
          }
        }
      }

      // Validar que fecha inicio no sea mayor que fecha fin para todos los tratamientos
      const medications = [
        { name: 'alend', label: 'Alendronato' },
        { name: 'risedr', label: 'Risedronato' },
        { name: 'iban', label: 'Ibandronato' },
        { name: 'zoled', label: 'Zoledronato' },
        { name: 'denos', label: 'Denosumab' },
        { name: 'ralox', label: 'Raloxifeno' },
        { name: 'bazed', label: 'Bazedoxifeno' },
        { name: 'tibol', label: 'Tibolona' },
        { name: 'terip', label: 'Teriparatida' },
        { name: 'abal', label: 'Abaloparatida' },
        { name: 'romo', label: 'Romosozumab' }
      ];

      for (const med of medications) {
        for (let i = 1; i <= 3; i++) {
          const fechaInicioKey = `${med.name}_ini_date_${i}` as keyof typeof data;
          const fechaFinKey = `${med.name}_end_date_${i}` as keyof typeof data;
          const continuaKey = `${med.name}_cont_${i}` as keyof typeof data;

          const fechaInicioStr = data[fechaInicioKey] as string | undefined;
          const fechaFinStr = data[fechaFinKey] as string | undefined;

          // Validar que "Continúa" sea obligatorio si hay fecha de inicio (para todos los tratamientos)
          if (fechaInicioStr) {
            const continua = data[continuaKey];
            if (!continua) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Este campo es obligatorio',
                path: [continuaKey as string]
              });
            }

            // Validar "¿Desea agregar otro tratamiento?" sea obligatorio si el tratamiento actual está "completo"
            // (Ya sea porque continúa activos o porque ha finalizado con todos los datos)
            const motivoKey = `${med.name}_reason_end_${i}` as keyof typeof data;
            const motivo = data[motivoKey];
            const agregarKey = `add_${med.name}_${i + 1}` as keyof typeof data;

            const isTreatmentComplete = continua === 'si' || (continua === 'no' && fechaFinStr && motivo);

            if (isTreatmentComplete && !data[agregarKey]) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Este campo es obligatorio',
                path: [agregarKey as string]
              });
            }
          }

          if (fechaInicioStr && fechaFinStr) {
            const partsInicio = fechaInicioStr.split('-').map(Number);
            const partsFin = fechaFinStr.split('-').map(Number);

            if (partsInicio.length === 3 && partsFin.length === 3) {
              const [dayInicio, monthInicio, yearInicio] = partsInicio;
              const [dayFin, monthFin, yearFin] = partsFin;

              if (
                dayInicio !== undefined &&
                monthInicio !== undefined &&
                yearInicio !== undefined &&
                dayFin !== undefined &&
                monthFin !== undefined &&
                yearFin !== undefined
              ) {
                const fechaInicio = new Date(yearInicio, monthInicio - 1, dayInicio);
                const fechaFin = new Date(yearFin, monthFin - 1, dayFin);

                if (fechaInicio > fechaFin) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `La fecha de inicio no puede ser posterior a la fecha de fin`,
                    path: [fechaFinKey as string]
                  });
                }
              }
            }
          }
        }
      }

      // Validar que si una fractura tiene algún campo rellenado, debe tener todos los campos obligatorios
      const fracturas = [
        { num: 1, label: 'primera' },
        { num: 2, label: 'segunda' },
        { num: 3, label: 'tercera' },
        { num: 4, label: 'cuarta' },
        { num: 5, label: 'quinta' },
        { num: 6, label: 'sexta' }
      ];

      // Neteja automàtica de fractures posteriors
      for (let i = 1; i < fracturas.length; i++) {
        const prevFechaKey = `frac_rec_date_${i}`;
        const currentAddKey = i === 1 ? undefined : `add_frac_${i}`;

        // Si no hi ha la data de la fractura anterior, O si explícitament hem dit que NO volem més fractures (a partir de la 1a)
        if (!(data as any)[prevFechaKey] || (currentAddKey && (data as any)[currentAddKey] === 'no')) {
          for (let j = i + 1; j <= fracturas.length; j++) {
            const fechaKey = `frac_rec_date_${j}`;
            const locKey = `frac_rec_loc_${j}`;
            const hospKey = `frac_rec_hosp_${j}`;
            const nextAddKey = `add_frac_${j}`;
            if ((data as any)[fechaKey]) (data as any)[fechaKey] = '';
            if ((data as any)[locKey]) (data as any)[locKey] = '';
            if ((data as any)[hospKey]) (data as any)[hospKey] = '';
            if ((data as any)[nextAddKey] && (data as any)[nextAddKey] !== 'no') (data as any)[nextAddKey] = 'no';
          }
        }
      }

      // Neteja automàtica de tractaments: si s'esborra la data d'inici del primer tractament,
      // s'esborren tots els camps de tots els tractaments d'aquest medicament
      for (const med of medications) {
        const iniKey1 = `${med.name}_ini_date_1`;
        if (!(data as any)[iniKey1]) {
          for (let j = 1; j <= 3; j++) {
            const iniKey = `${med.name}_ini_date_${j}`;
            const endKey = `${med.name}_end_date_${j}`;
            const contKey = `${med.name}_cont_${j}`;
            const reasonKey = `${med.name}_reason_end_${j}`;
            const addKey = `add_${med.name}_${j + 1}`;
            if ((data as any)[iniKey]) (data as any)[iniKey] = '';
            if ((data as any)[endKey]) (data as any)[endKey] = '';
            if ((data as any)[contKey]) (data as any)[contKey] = '';
            if ((data as any)[reasonKey]) (data as any)[reasonKey] = '';
            if ((data as any)[addKey]) (data as any)[addKey] = '';
          }
          // També neteja el camp de detalls addicionals si existeix
          const detailsKey = `${med.name}_additional_details`;
          if ((data as any)[detailsKey]) (data as any)[detailsKey] = '';
        } else {
          // Neteja automàtica de tractaments posteriors
          for (let i = 1; i <= 3; i++) {
            const iniKey = `${med.name}_ini_date_${i}`;
            const endKey = `${med.name}_end_date_${i}`;
            const contKey = `${med.name}_cont_${i}`;
            const reasonKey = `${med.name}_reason_end_${i}`;
            const currentAddKey = `add_${med.name}_${i + 1}`;

            // Si el tractament I no té data d'inici, o ens diuen que no volen el I+1 i estem tractant de netejar...
            // Espera, millor tractar seqüencialment.

            // Si estem en l'element `i` i falta l'inici, esborrem a partir de la informació associada (inici no l'esborrem explícitament pq ja no hi és).
            // També si l'usuari ha marcat explicitament que NO vol l'element següent, ens encarreguem d'esborrar el següent
            if (!(data as any)[iniKey] || (currentAddKey && (data as any)[currentAddKey] === 'no')) {
              // Si falla la data d'inici de i, borrem restes de i cap endavant.
              // Si no, si diu q 'no' a add, borrem i+1 cap endavant
              const startClearFrom = !(data as any)[iniKey] ? i : i + 1;

              for (let j = startClearFrom; j <= 3; j++) {
                const nextIniKey = `${med.name}_ini_date_${j}`;
                const nextEndKey = `${med.name}_end_date_${j}`;
                const nextContKey = `${med.name}_cont_${j}`;
                const nextReasonKey = `${med.name}_reason_end_${j}`;
                const addNextKey = `add_${med.name}_${j + 1}`;

                // Si startClearFrom > i, per j=startClearFrom sí hem d'esborrar l'iniKey j
                if (startClearFrom > i || j > startClearFrom) {
                  if ((data as any)[nextIniKey]) {
                    (data as any)[nextIniKey] = '';
                  }
                }

                if ((data as any)[nextEndKey]) (data as any)[nextEndKey] = '';
                if ((data as any)[nextContKey]) (data as any)[nextContKey] = '';
                if ((data as any)[nextReasonKey]) (data as any)[nextReasonKey] = '';
                // Només el posem buit si no estem en el add que acabem de fer no, ni abans
                if (j >= startClearFrom) {
                  // tot el que quedi per davant l'esborrem o posem buit
                  if ((data as any)[addNextKey] && (data as any)[addNextKey] !== 'no') {
                    (data as any)[addNextKey] = '';
                  }
                }
              }
            }
          }
        }
      }

      for (const fractura of fracturas) {
        const fechaKey = (
          fractura.num === 1 ? 'frac_rec_date_1' : `frac_rec_date_${fractura.num}`
        ) as keyof typeof data;
        const localizacionKey = (
          fractura.num === 1 ? 'frac_rec_loc_1' : `frac_rec_loc_${fractura.num}`
        ) as keyof typeof data;
        const frac_rec_hospKey = (
          fractura.num === 1 ? 'frac_rec_hosp_1' : `frac_rec_hosp_${fractura.num}`
        ) as keyof typeof data;

        const fecha = data[fechaKey];
        const localizacion = data[localizacionKey];
        const frac_rec_hosp_1 = data[frac_rec_hospKey];

        // Si algún campo está lleno, todos deben estarlo
        const hasSomeData = fecha || localizacion || frac_rec_hosp_1;
        const hasAllData = fecha && localizacion && frac_rec_hosp_1;

        if (hasSomeData && !hasAllData) {
          if (!fecha) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La ${fractura.label} fractura está incompleta. Debe completar la fecha o borrar todos los campos (fecha, localización y hospitalización) para eliminarla.`,
              path: [fechaKey as string]
            });
          }
          if (!localizacion) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La ${fractura.label} fractura está incompleta. Debe completar la localización o borrar todos los campos (fecha, localización y hospitalización) para eliminarla.`,
              path: [localizacionKey as string]
            });
          }
          if (!frac_rec_hosp_1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La ${fractura.label} fractura está incompleta. Debe completar la hospitalización o borrar todos los campos (fecha, localización y hospitalización) para eliminarla.`,
              path: [frac_rec_hospKey as string]
            });
          }
        }
      }
    }) // Fet! Tot ben tancat
});
