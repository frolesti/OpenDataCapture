import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

// Helper function to make a field conditional on informed consent
function requiresConsent<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['informed_consent'] as const,
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
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `frac_rec_date${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`,
      `frac_rec_loc${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`,
      `frac_rec_hosp${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`,
      `add_frac_${fractureNumber}`
    ] as const,
    render(data: any): any {
      if (fractureNumber === 1) {
        // First fracture always shows if consent is given
        if (data.informed_consent === 'si') {
          return field;
        }
        return null;
      }

      // For subsequent fractures, check if:
      // 1. Previous fracture is completed (all 3 fields)
      // 2. User wants to add this fracture
      const prevFechaKey = `frac_rec_date${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`;
      const prevLocalizacionKey = `frac_rec_loc${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`;
      const prevHospitalizacionKey = `frac_rec_hosp${fractureNumber - 1 === 1 ? '' : '_' + (fractureNumber - 1)}`;
      const agregarKey = `add_frac_${fractureNumber}`;

      const isPreviousComplete = data[prevFechaKey] && data[prevLocalizacionKey] && data[prevHospitalizacionKey];

      // Show if previous is complete AND user said yes to adding this fracture
      if (data.informed_consent === 'si' && isPreviousComplete && data[agregarKey] === 'si') {
        return field;
      }

      return null;
    }
  };
}

// Helper function to show "Add another fracture?" button after each complete fracture
function showAddFractureButton(fractureNumber: number): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `frac_rec_date${fractureNumber === 1 ? '' : '_' + fractureNumber}`,
      `frac_rec_loc${fractureNumber === 1 ? '' : '_' + fractureNumber}`,
      `frac_rec_hosp${fractureNumber === 1 ? '' : '_' + fractureNumber}`
    ] as const,
    render(data: any): any {
      const fechaKey = `frac_rec_date${fractureNumber === 1 ? '' : '_' + fractureNumber}`;
      const localizacionKey = `frac_rec_loc${fractureNumber === 1 ? '' : '_' + fractureNumber}`;
      const frac_rec_hospKey = `frac_rec_hosp${fractureNumber === 1 ? '' : '_' + fractureNumber}`;

      // Show button only if current fracture is complete
      const isCurrentComplete = data[fechaKey] && data[localizacionKey] && data[frac_rec_hospKey];

      if (data.informed_consent === 'si' && isCurrentComplete && fractureNumber < 6) {
        return {
          kind: 'string' as const,
          label: `¿Desea agregar ${fractureNumber === 1 ? 'una segunda' : fractureNumber === 2 ? 'una tercera' : fractureNumber === 3 ? 'una cuarta' : fractureNumber === 4 ? 'una quinta' : 'una sexta'} fractura por fragilidad? *`,
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
      if (data.informed_consent === 'si' && isMedicationTreatmentComplete(data, medicationName, treatmentNumber)) {
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

    // Continúa (only for treatments 1 and 2)
    if (i < maxTreatments) {
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
    }

    // Fecha fin
    // For the last treatment (3), we show Fecha Fin directly without asking "Continua"
    // For others, it depends on "Continua" being "No"
    if (i === maxTreatments) {
      fields[`${medicationName}_end_date_${i}`] = requiresMedicationStartDate(
        {
          kind: 'string',
          variant: 'input',
          placeholder: 'DD-MM-YYYY',
          label: `${treatmentLabel} - Fecha fin (DD-MM-YYYY)`
        },
        medicationName,
        i
      );
    } else {
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
    }

    // Motivo interrupción
    // Same logic as Fecha Fin
    if (i === maxTreatments) {
      fields[`${medicationName}_reason_end_${i}`] = requiresMedicationStartDate(
        {
          kind: 'string',
          label: `${treatmentLabel} - Motivo interrupción`,
          variant: 'select',
          options: motivoOptions
        },
        medicationName,
        i
      );
    } else {
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
    }

    // Add treatment button (except for last treatment)
    if (i < maxTreatments) {
      fields[`add_${medicationName}_${i + 1}`] = showAddMedicationButton(medicationName, medicationLabel, i);
    }
  }

  // Add open text field for details if more than 3 treatments
  fields[`${medicationName}_additional_details`] = {
    kind: 'dynamic' as const,
    deps: [
      'informed_consent',
      `${medicationName}_ini_date_${maxTreatments}`,
      `${medicationName}_end_date_${maxTreatments}`
    ] as const,
    render(data: any): any {
      const lastStartKey = `${medicationName}_ini_date_${maxTreatments}`;
      const lastEndKey = `${medicationName}_end_date_${maxTreatments}`;

      if (data.informed_consent === 'si' && data[lastStartKey] && data[lastEndKey]) {
        return {
          kind: 'string',
          variant: 'textarea',
          label: `En caso de que tenga más de tres tratamientos de ${medicationLabel}, especificar los detalles a continuación`,
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
      .optional();

    if (i < maxTreatments) {
      schemas[`${medicationName}_cont_${i}`] = z.enum(['si', 'no']).optional();
    }

    schemas[`${medicationName}_end_date_${i}`] = z
      .string()
      .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
      .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
      .optional();
    schemas[`${medicationName}_reason_end_${i}`] = motivoEnum.optional();

    if (i < maxTreatments) {
      schemas[`add_${medicationName}_${i + 1}`] = z.enum(['si', 'no']).optional();
    }
  }

  schemas[`${medicationName}_additional_details`] = z.string().optional();

  return schemas;
}

// Custom field name mappings for export
const fieldNameMappings: Record<string, string> = {
  // Criteria and IDs
  patientID: 'patientID',
  informed_consent: 'informed_consent',
  consent_date: 'consent_date',
  // Note: criterios individuales eliminados - s'exporten com sum_inclusion i sum_exclusion

  // Patient characteristics
  CAP: 'CAP',
  sex: 'sex',
  age: 'age',
  weight: 'weight',
  height: 'height',
  cifosis: 'cifosis',
  height_loss: 'height_loss',
  lifestyle: 'lifestyle',

  // Risk factors
  IMCm20: 'IMCm20',
  ethnicity_caucasian: 'ethnicity_caucasian',
  early_menopause: 'early_menopause',
  previous_fracture: 'previous_fracture',
  parent_hip_fracture: 'parent_hip_fracture',
  smoking: 'smoking',
  alcohol: 'alcohol',
  poor_nutrition: 'poor_nutrition',
  associated_medications: 'associated_medications',
  rheumatoid_arthritis: 'rheumatoid_arthritis',
  other_inflammatory_arthritis: 'other_inflammatory_arthritis',
  lupus: 'lupus',
  hyperparathyroidism: 'hyperparathyroidism',
  hyperthyroidism: 'hyperthyroidism',
  hypercortisolism: 'hypercortisolism',
  diabetes: 'diabetes',
  inflammatory_bowel_disease: 'inflammatory_bowel_disease',
  malnutrition: 'malnutrition',
  parenteral_nutrition: 'parenteral_nutrition',
  myeloma: 'myeloma',
  other_marrow_disorders: 'other_marrow_disorders',
  copd: 'copd',
  chronic_kidney_disease: 'chronic_kidney_disease',

  // Diagnosis
  diag: 'diag',
  diag_date: 'diag_date',
  Diag_method: 'Diag_method',
  Diag_method_other: 'Diag_method_other',

  // Non-pharmacological treatments
  exercise: 'exercise',
  exercise_cont: 'exercise_cont',
  calcium_vitaminD: 'calcium_vitaminD',
  calcium_vitaminD_cont: 'calcium_vitaminD_cont',
  quit_smoking: 'quit_smoking',
  quit_smoking_cont: 'quit_smoking_cont',
  alcohol_reduction: 'alcohol_reduction',
  alcohol_reduction_cont: 'alcohol_reduction_cont',
  hip_protectors: 'hip_protectors',
  hip_protectors_cont: 'hip_protectors_cont',
  other_treatment: 'other_treatment',

  // End of study
  date_end_study: 'date_end_study',
  study_completion: 'study_completion',
  reason_not_completed: 'reason_not_completed',
  reason_not_completed_other: 'reason_not_completed_other',
  Investigator_initials: 'Investigator_initials',

  // Recent fractures
  frac_rec_date: 'frac_rec_date',
  frac_rec_loc: 'frac_rec_loc',
  frac_rec_hosp: 'frac_rec_hosp',
  add_frac_2: 'add_frac_2',
  frac_rec_date_2: 'frac_rec_date_2',
  frac_rec_loc_2: 'frac_rec_loc_2',
  frac_rec_hosp_2: 'frac_rec_hosp_2',
  add_frac_3: 'add_frac_3',
  frac_rec_date_3: 'frac_rec_date_3',
  frac_rec_loc_3: 'frac_rec_loc_3',
  frac_rec_hosp_3: 'frac_rec_hosp_3',
  add_frac_4: 'add_frac_4',
  frac_rec_date_4: 'frac_rec_date_4',
  frac_rec_loc_4: 'frac_rec_loc_4',
  frac_rec_hosp_4: 'frac_rec_hosp_4',
  add_frac_5: 'add_frac_5',
  frac_rec_date_5: 'frac_rec_date_5',
  frac_rec_loc_5: 'frac_rec_loc_5',
  frac_rec_hosp_5: 'frac_rec_hosp_5',
  add_frac_6: 'add_frac_6',
  frac_rec_date_6: 'frac_rec_date_6',
  frac_rec_loc_6: 'frac_rec_loc_6',
  frac_rec_hosp_6: 'frac_rec_hosp_6',

  // Medications - Alendronato
  alendronatoFechaInicio1: 'alend_ini_date_1',
  alendronatoContinua1: 'alend_cont_1',
  alendronatoFechaFin1: 'alend_end_date_1',
  alendronatoMotivoInterrupcion1: 'alend_reason_end',
  add_alendronato2: 'add_alend_2',
  alendronatoFechaInicio2: 'alend_ini_date_2',
  alendronatoContinua2: 'alend_cont_2',
  alendronatoFechaFin2: 'alend_end_date_2',
  alendronatoMotivoInterrupcion2: 'alend_reason_end_2',
  add_alendronato3: 'add_alend_3',
  alendronatoFechaInicio3: 'alend_ini_date_3',
  alendronatoFechaFin3: 'alend_end_date_3',
  alendronatoMotivoInterrupcion3: 'alend_reason_end_3',
  alendronatoDetallesAdicionales: 'alend_additional_details',

  // Medications - Risedronato
  risedronatoFechaInicio1: 'risedr_ini_date_1',
  risedronatoContinua1: 'risedr_cont_1',
  risedronatoFechaFin1: 'risedr_end_date_1',
  risedronatoMotivoInterrupcion1: 'risedr_reason_end',
  add_risedronato2: 'add_risedr_2',
  risedronatoFechaInicio2: 'risedr_ini_date_2',
  risedronatoContinua2: 'risedr_cont_2',
  risedronatoFechaFin2: 'risedr_end_date_2',
  risedronatoMotivoInterrupcion2: 'risedr_reason_end_2',
  add_risedronato3: 'add_risedr_3',
  risedronatoFechaInicio3: 'risedr_ini_date_3',
  risedronatoFechaFin3: 'risedr_end_date_3',
  risedronatoMotivoInterrupcion3: 'risedr_reason_end_3',
  risedronatoDetallesAdicionales: 'risedr_additional_details',

  // Medications - Ibandronato
  ibandronatoFechaInicio1: 'iband_ini_date_1',
  ibandronatoContinua1: 'iband_cont_1',
  ibandronatoFechaFin1: 'iband_end_date_1',
  ibandronatoMotivoInterrupcion1: 'iband_reason_end',
  add_ibandronato2: 'add_iband_2',
  ibandronatoFechaInicio2: 'iband_ini_date_2',
  ibandronatoContinua2: 'iband_cont_2',
  ibandronatoFechaFin2: 'iband_end_date_2',
  ibandronatoMotivoInterrupcion2: 'iband_reason_end_2',
  add_ibandronato3: 'add_iband_3',
  ibandronatoFechaInicio3: 'iband_ini_date_3',
  ibandronatoFechaFin3: 'iband_end_date_3',
  ibandronatoMotivoInterrupcion3: 'iband_reason_end_3',
  ibandronatoDetallesAdicionales: 'iband_additional_details',

  // Medications - Zoledronato
  zoledronatoFechaInicio1: 'zoledr_ini_date_1',
  zoledronatoContinua1: 'zoledr_cont_1',
  zoledronatoFechaFin1: 'zoledr_end_date_1',
  zoledronatoMotivoInterrupcion1: 'zoledr_reason_end',
  add_zoledronato2: 'add_zoledr_2',
  zoledronatoFechaInicio2: 'zoledr_ini_date_2',
  zoledronatoContinua2: 'zoledr_cont_2',
  zoledronatoFechaFin2: 'zoledr_end_date_2',
  zoledronatoMotivoInterrupcion2: 'zoledr_reason_end_2',
  add_zoledronato3: 'add_zoledr_3',
  zoledronatoFechaInicio3: 'zoledr_ini_date_3',
  zoledronatoFechaFin3: 'zoledr_end_date_3',
  zoledronatoMotivoInterrupcion3: 'zoledr_reason_end_3',
  zoledronatoDetallesAdicionales: 'zoledr_additional_details',

  // Medications - Denosumab
  denosumabFechaInicio1: 'denos_ini_date_1',
  denosumabContinua1: 'denos_cont_1',
  denosumabFechaFin1: 'denos_end_date_1',
  denosumabMotivoInterrupcion1: 'denos_reason_end',
  add_denosumab2: 'add_denos_2',
  denosumabFechaInicio2: 'denos_ini_date_2',
  denosumabContinua2: 'denos_cont_2',
  denosumabFechaFin2: 'denos_end_date_2',
  denosumabMotivoInterrupcion2: 'denos_reason_end_2',
  add_denosumab3: 'add_denos_3',
  denosumabFechaInicio3: 'denos_ini_date_3',
  denosumabFechaFin3: 'denos_end_date_3',
  denosumabMotivoInterrupcion3: 'denos_reason_end_3',
  denosumabDetallesAdicionales: 'denos_additional_details',

  // Medications - Raloxifeno
  raloxifenoFechaInicio1: 'ralox_ini_date_1',
  raloxifenoContinua1: 'ralox_cont_1',
  raloxifenoFechaFin1: 'ralox_end_date_1',
  raloxifenoMotivoInterrupcion1: 'ralox_reason_end',
  add_raloxifeno2: 'add_ralox_2',
  raloxifenoFechaInicio2: 'ralox_ini_date_2',
  raloxifenoContinua2: 'ralox_cont_2',
  raloxifenoFechaFin2: 'ralox_end_date_2',
  raloxifenoMotivoInterrupcion2: 'ralox_reason_end_2',
  add_raloxifeno3: 'add_ralox_3',
  raloxifenoFechaInicio3: 'ralox_ini_date_3',
  raloxifenoFechaFin3: 'ralox_end_date_3',
  raloxifenoMotivoInterrupcion3: 'ralox_reason_end_3',
  raloxifenoDetallesAdicionales: 'ralox_additional_details',

  // Medications - Bazedoxifeno
  bazedoxifenoFechaInicio1: 'bazed_ini_date_1',
  bazedoxifenoContinua1: 'bazed_cont_1',
  bazedoxifenoFechaFin1: 'bazed_end_date_1',
  bazedoxifenoMotivoInterrupcion1: 'bazed_reason_end',
  add_bazedoxifeno2: 'add_bazed_2',
  bazedoxifenoFechaInicio2: 'bazed_ini_date_2',
  bazedoxifenoContinua2: 'bazed_cont_2',
  bazedoxifenoFechaFin2: 'bazed_end_date_2',
  bazedoxifenoMotivoInterrupcion2: 'bazed_reason_end_2',
  add_bazedoxifeno3: 'add_bazed_3',
  bazedoxifenoFechaInicio3: 'bazed_ini_date_3',
  bazedoxifenoFechaFin3: 'bazed_end_date_3',
  bazedoxifenoMotivoInterrupcion3: 'bazed_reason_end_3',
  bazedoxifenoDetallesAdicionales: 'bazed_additional_details',

  // Medications - Tibolona
  tibolonaFechaInicio1: 'tibol_ini_date_1',
  tibolonaContinua1: 'tibol_cont_1',
  tibolonaFechaFin1: 'tibol_end_date_1',
  tibolonaMotivoInterrupcion1: 'tibol_reason_end',
  add_tibolona2: 'add_tibol_2',
  tibolonaFechaInicio2: 'tibol_ini_date_2',
  tibolonaContinua2: 'tibol_cont_2',
  tibolonaFechaFin2: 'tibol_end_date_2',
  tibolonaMotivoInterrupcion2: 'tibol_reason_end_2',
  add_tibolona3: 'add_tibol_3',
  tibolonaFechaInicio3: 'tibol_ini_date_3',
  tibolonaFechaFin3: 'tibol_end_date_3',
  tibolonaMotivoInterrupcion3: 'tibol_reason_end_3',
  tibolonaDetallesAdicionales: 'tibol_additional_details',

  // Medications - Teriparatida
  teriparatidaFechaInicio1: 'terip_ini_date_1',
  teriparatidaContinua1: 'terip_cont_1',
  teriparatidaFechaFin1: 'terip_end_date_1',
  teriparatidaMotivoInterrupcion1: 'terip_reason_end',
  add_teriparatida2: 'add_terip_2',
  teriparatidaFechaInicio2: 'terip_ini_date_2',
  teriparatidaContinua2: 'terip_cont_2',
  teriparatidaFechaFin2: 'terip_end_date_2',
  teriparatidaMotivoInterrupcion2: 'terip_reason_end_2',
  add_teriparatida3: 'add_terip_3',
  teriparatidaFechaInicio3: 'terip_ini_date_3',
  teriparatidaFechaFin3: 'terip_end_date_3',
  teriparatidaMotivoInterrupcion3: 'terip_reason_end_3',
  teriparatidaDetallesAdicionales: 'terip_additional_details',

  // Medications - Abaloparatida
  abaloparatidaFechaInicio1: 'abalop_ini_date_1',
  abaloparatidaContinua1: 'abalop_cont_1',
  abaloparatidaFechaFin1: 'abalop_end_date_1',
  abaloparatidaMotivoInterrupcion1: 'abalop_reason_end',
  add_abaloparatida2: 'add_abalop_2',
  abaloparatidaFechaInicio2: 'abalop_ini_date_2',
  abaloparatidaContinua2: 'abalop_cont_2',
  abaloparatidaFechaFin2: 'abalop_end_date_2',
  abaloparatidaMotivoInterrupcion2: 'abalop_reason_end_2',
  add_abaloparatida3: 'add_abalop_3',
  abaloparatidaFechaInicio3: 'abalop_ini_date_3',
  abaloparatidaFechaFin3: 'abalop_end_date_3',
  abaloparatidaMotivoInterrupcion3: 'abalop_reason_end_3',
  abaloparatidaDetallesAdicionales: 'abalop_additional_details',

  // Medications - Romosozumab
  romosozumabFechaInicio1: 'romos_ini_date_1',
  romosozumabContinua1: 'romos_cont_1',
  romosozumabFechaFin1: 'romos_end_date_1',
  romosozumabMotivoInterrupcion1: 'romos_reason_end',
  add_romosozumab2: 'add_romos_2',
  romosozumabFechaInicio2: 'romos_ini_date_2',
  romosozumabContinua2: 'romos_cont_2',
  romosozumabFechaFin2: 'romos_end_date_2',
  romosozumabMotivoInterrupcion2: 'romos_reason_end_2',
  add_romosozumab3: 'add_romos_3',
  romosozumabFechaInicio3: 'romos_ini_date_3',
  romosozumabFechaFin3: 'romos_end_date_3',
  romosozumabMotivoInterrupcion3: 'romos_reason_end_3',
  romosozumabDetallesAdicionales: 'romos_additional_details'
};

// Function to generate all measures (fields) for export
function generateAllMeasures() {
  return {}; // Fields are now native
}

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Osteoporosis', 'Primary Care'],
  internal: {
    edition: 8,
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
        IMCm20: requiresConsent({
          kind: 'boolean',
          label: 'IMC (< 20 kg/m²)',
          variant: 'checkbox'
        }),
        ethnicity_caucasian: requiresConsent({
          kind: 'boolean',
          label: 'Etnicidad (paciente blanco/a caucásico/a)',
          variant: 'checkbox'
        }),
        early_menopause: requiresConsent({
          kind: 'boolean',
          label: 'Menopausia precoz (<45 años)',
          variant: 'checkbox'
        }),
        previous_fracture: requiresConsent({
          kind: 'boolean',
          label: 'Fractura previa',
          variant: 'checkbox'
        }),
        parent_hip_fracture: requiresConsent({
          kind: 'boolean',
          label: 'Antecedente paterno/materno de fractura femoral',
          variant: 'checkbox'
        }),
        smoking: requiresConsent({
          kind: 'boolean',
          label: 'Tabaquismo activo',
          variant: 'checkbox'
        }),
        alcohol: requiresConsent({
          kind: 'boolean',
          label: 'Ingesta de alcohol ≥3 unidades/día',
          variant: 'checkbox'
        }),
        poor_nutrition: requiresConsent({
          kind: 'boolean',
          label:
            'Nutrición pobre - dieta baja en calcio (definiéndose como ingesta baja en calcio un aporte de < 3 unidades de calcio diarias; siendo 1 vaso de leche, 1 yogur o 40 g de queso 1 unidad)',
          variant: 'checkbox'
        }),
        associated_medications: requiresConsent({
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
        rheumatoid_arthritis: requiresConsent({
          kind: 'boolean',
          label: 'Artritis reumatoide',
          variant: 'checkbox'
        }),
        other_inflammatory_arthritis: requiresConsent({
          kind: 'boolean',
          label: 'Otras artritis inflamatorias',
          variant: 'checkbox'
        }),
        lupus: requiresConsent({
          kind: 'boolean',
          label: 'Lupus eritematoso sistémico',
          variant: 'checkbox'
        }),
        hyperparathyroidism: requiresConsent({
          kind: 'boolean',
          label: 'Hiperparatiroidismo',
          variant: 'checkbox'
        }),
        hyperthyroidism: requiresConsent({
          kind: 'boolean',
          label: 'Hipertiroidismo',
          variant: 'checkbox'
        }),
        hypercortisolism: requiresConsent({
          kind: 'boolean',
          label: 'Hipercortisolismo/Cushing',
          variant: 'checkbox'
        }),
        diabetes: requiresConsent({
          kind: 'boolean',
          label: 'Diabetes (tipos 1 y 2)',
          variant: 'checkbox'
        }),
        inflammatory_bowel_disease: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad inflamatoria intestinal',
          variant: 'checkbox'
        }),
        malnutrition: requiresConsent({
          kind: 'boolean',
          label: 'Malnutrición',
          variant: 'checkbox'
        }),
        parenteral_nutrition: requiresConsent({
          kind: 'boolean',
          label: 'Nutrición parenteral',
          variant: 'checkbox'
        }),
        myeloma: requiresConsent({
          kind: 'boolean',
          label: 'Mieloma múltiple',
          variant: 'checkbox'
        }),
        other_marrow_disorders: requiresConsent({
          kind: 'boolean',
          label: 'Otros trastornos medulares',
          variant: 'checkbox'
        }),
        copd: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad pulmonar obstructiva crónica (EPOC)',
          variant: 'checkbox'
        }),
        chronic_kidney_disease: requiresConsent({
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
        frac_rec_date: requiresPreviousFracture(
          {
            kind: 'string',
            variant: 'input',
            placeholder: 'DD-MM-YYYY',
            label: 'Fecha de la Fractura por Fragilidad (DD-MM-YYYY) *'
          },
          1
        ),
        frac_rec_loc: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización de la fractura por fragilidad - Elegir una opción *',
            variant: 'select',
            options: {
              vertebral: 'Vertebral',
              femoral: 'Femoral',
              humero: 'Húmero',
              radioMuneen: 'Radio/cubito/muñeca',
              pelvis: 'Pelvis',
              costilla: 'Costilla',
              tobillopie: 'Tobillo/pie',
              otras: 'Otras'
            }
          },
          1
        ),
        frac_rec_hosp: requiresPreviousFracture(
          {
            kind: 'string',
            label: '¿Requirió hospitalización? *',
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
              radioMuneen: 'Radio/cubito/muñeca',
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
              radioMuneen: 'Radio/cubito/muñeca',
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
              radioMuneen: 'Radio/cubito/muñeca',
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
              radioMuneen: 'Radio/cubito/muñeca',
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
              radioMuneen: 'Radio/cubito/muñeca',
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
        Diag_method: requiresDiagnosis({
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
        Diag_method_other: {
          kind: 'dynamic' as const,
          deps: ['diag', 'Diag_method'] as const,
          render(data: any) {
            if (data.diag === 'si' && data.Diag_method === 'otro') {
              return {
                kind: 'string' as const,
                label: 'Otro (especificar):',
                variant: 'input' as const
              };
            }
            return null;
          }
        }
      }
    },
    {
      title: 'PRESCRIPCIÓN DEL TRATAMIENTO DE OSTEOPOROSIS',
      description: 'Indique los tratamientos prescritos. Si un tratamiento no aplica, no es necesario contestar.',
      fields: {
        _warningTratamiento: consentWarning() as any,
        // All medications with up to 3 treatments each
        ...generateMedicationFields('alend', 'Alendronato'),
        ...generateMedicationFields('risedr', 'Risedronato'),
        ...generateMedicationFields('iband', 'Ibandronato'),
        ...generateMedicationFields('zoledr', 'Zoledronato'),
        ...generateMedicationFields('denos', 'Denosumab'),
        ...generateMedicationFields('ralox', 'Raloxifeno'),
        ...generateMedicationFields('bazed', 'Bazedoxifeno'),
        ...generateMedicationFields('tibol', 'Tibolona'),
        ...generateMedicationFields('terip', 'Teriparatida'),
        ...generateMedicationFields('abalop', 'Abaloparatida'),
        ...generateMedicationFields('romos', 'Romosozumab')
      }
    },
    {
      title: 'TRATAMIENTO NO FARMACOLÓGICO OSTEOPOROSIS',
      description: 'Indique los tratamientos no farmacológicos recibidos',
      fields: {
        _warningTratamientoNoFarmacologico: consentWarning() as any,
        exercise: requiresConsent({
          kind: 'string',
          label: 'Ejercicio físico - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        exercise_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Ejercicio físico - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'exercise'
        ),
        calcium_vitaminD: requiresConsent({
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        calcium_vitaminD_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Suplementos de calcio / vitamina D - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'calcium_vitaminD'
        ),
        quit_smoking: requiresConsent({
          kind: 'string',
          label: 'Dejar de fumar - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        quit_smoking_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Dejar de fumar - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'quit_smoking'
        ),
        alcohol_reduction: requiresConsent({
          kind: 'string',
          label: 'Reducción de consumo de alcohol - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        alcohol_reduction_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Reducción de consumo de alcohol - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'alcohol_reduction'
        ),
        hip_protectors: requiresConsent({
          kind: 'string',
          label: 'Protectores de cadera - ¿Lo ha recibido? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        hip_protectors_cont: requiresRecibido(
          {
            kind: 'string',
            label: 'Protectores de cadera - Continúa *',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'hip_protectors'
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
    ...generateAllMeasures(),
    imc: {
      kind: 'computed',
      label: 'Índice de Masa Corporal',
      value: (data) => {
        if (data.weight && data.height) {
          const peso = data.weight;
          const altura = data.height;

          if (altura === 0) {
            return undefined;
          }

          const alturaMetros = altura / 100;
          return Math.round((peso / (alturaMetros * alturaMetros)) * 100) / 100;
        }
        return undefined;
      }
    },
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
      IMCm20: z.boolean().optional(),
      ethnicity_caucasian: z.boolean().optional(),
      early_menopause: z.boolean().optional(),
      previous_fracture: z.boolean().optional(),
      parent_hip_fracture: z.boolean().optional(),
      smoking: z.boolean().optional(),
      alcohol: z.boolean().optional(),
      poor_nutrition: z.boolean().optional(),
      associated_medications: z.boolean().optional(),

      // COMORBILIDADES
      rheumatoid_arthritis: z.boolean().optional(),
      other_inflammatory_arthritis: z.boolean().optional(),
      lupus: z.boolean().optional(),
      hyperparathyroidism: z.boolean().optional(),
      hyperthyroidism: z.boolean().optional(),
      hypercortisolism: z.boolean().optional(),
      diabetes: z.boolean().optional(),
      inflammatory_bowel_disease: z.boolean().optional(),
      malnutrition: z.boolean().optional(),
      parenteral_nutrition: z.boolean().optional(),
      myeloma: z.boolean().optional(),
      other_marrow_disorders: z.boolean().optional(),
      copd: z.boolean().optional(),
      chronic_kidney_disease: z.boolean().optional(),

      // FRACTURA
      frac_rec_date: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp: z.enum(['si', 'no']).optional(),
      add_frac_2: z.enum(['si', 'no']).optional(),
      frac_rec_date_2: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_2: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_2: z.enum(['si', 'no']).optional(),
      add_frac_3: z.enum(['si', 'no']).optional(),
      frac_rec_date_3: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_3: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_3: z.enum(['si', 'no']).optional(),
      add_frac_4: z.enum(['si', 'no']).optional(),
      frac_rec_date_4: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_4: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_4: z.enum(['si', 'no']).optional(),
      add_frac_5: z.enum(['si', 'no']).optional(),
      frac_rec_date_5: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_5: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_5: z.enum(['si', 'no']).optional(),
      add_frac_6: z.enum(['si', 'no']).optional(),
      frac_rec_date_6: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      frac_rec_loc_6: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      frac_rec_hosp_6: z.enum(['si', 'no']).optional(),

      // DIAGNÓSTICO
      diag: z.enum(['si', 'no']).optional(),
      diag_date: z
        .string()
        .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/, 'Formato inválido (DD-MM-YYYY)')
        .refine(isValidDate, 'Fecha inválida (el día no existe en el mes indicado)')
        .optional(),
      Diag_method: z.enum(['dxa', 'clinico', 'frax', 'hallazgo', 'presuntivo', 'otro']).optional(),
      Diag_method_other: z.string().optional(),

      // TRATAMIENTOS (todos opcionales)
      ...generateMedicationValidationSchemas('alend'),
      ...generateMedicationValidationSchemas('risedr'),
      ...generateMedicationValidationSchemas('iband'),
      ...generateMedicationValidationSchemas('zoledr'),
      ...generateMedicationValidationSchemas('denos'),
      ...generateMedicationValidationSchemas('ralox'),
      ...generateMedicationValidationSchemas('bazed'),
      ...generateMedicationValidationSchemas('tibol'),
      ...generateMedicationValidationSchemas('terip'),
      ...generateMedicationValidationSchemas('abalop'),
      ...generateMedicationValidationSchemas('romos'),

      // TRATAMIENTO NO FARMACOLÓGICO
      exercise: z.enum(['si', 'no']).optional(),
      exercise_cont: z.enum(['si', 'no']).optional(),
      calcium_vitaminD: z.enum(['si', 'no']).optional(),
      calcium_vitaminD_cont: z.enum(['si', 'no']).optional(),
      quit_smoking: z.enum(['si', 'no']).optional(),
      quit_smoking_cont: z.enum(['si', 'no']).optional(),
      alcohol_reduction: z.enum(['si', 'no']).optional(),
      alcohol_reduction_cont: z.enum(['si', 'no']).optional(),
      hip_protectors: z.enum(['si', 'no']).optional(),
      hip_protectors_cont: z.enum(['si', 'no']).optional(),
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
          'frac_rec_date',
          'frac_rec_loc',
          'frac_rec_hosp',
          'diag',
          'exercise',
          'calcium_vitaminD',
          'quit_smoking',
          'alcohol_reduction',
          'hip_protectors',
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
        if (data.exercise === 'si' && !data.exercise_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['exercise_cont']
          });
        }
        if (data.calcium_vitaminD === 'si' && !data.calcium_vitaminD_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['calcium_vitaminD_cont']
          });
        }
        if (data.quit_smoking === 'si' && !data.quit_smoking_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['quit_smoking_cont']
          });
        }
        if (data.alcohol_reduction === 'si' && !data.alcohol_reduction_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['alcohol_reduction_cont']
          });
        }
        if (data.hip_protectors === 'si' && !data.hip_protectors_cont) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Este campo es obligatorio',
            path: ['hip_protectors_cont']
          });
        }

        if (data.diag === 'si') {
          if (!data.diag_date)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['diag_date']
            });
          if (!data.Diag_method)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Este campo es obligatorio',
              path: ['Diag_method']
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
        { name: 'iband', label: 'Ibandronato' },
        { name: 'zoledr', label: 'Zoledronato' },
        { name: 'denos', label: 'Denosumab' },
        { name: 'ralox', label: 'Raloxifeno' },
        { name: 'bazed', label: 'Bazedoxifeno' },
        { name: 'tibol', label: 'Tibolona' },
        { name: 'terip', label: 'Teriparatida' },
        { name: 'abalop', label: 'Abaloparatida' },
        { name: 'romos', label: 'Romosozumab' }
      ];

      for (const med of medications) {
        for (let i = 1; i <= 3; i++) {
          const fechaInicioKey = `${med.name}FechaInicio${i}` as keyof typeof data;
          const fechaFinKey = `${med.name}FechaFin${i}` as keyof typeof data;
          const continuaKey = `${med.name}Continua${i}` as keyof typeof data;

          const fechaInicioStr = data[fechaInicioKey] as string | undefined;
          const fechaFinStr = data[fechaFinKey] as string | undefined;

          // Validar que "Continúa" sea obligatorio si hay fecha de inicio (solo para tratamiento 1 y 2)
          if (fechaInicioStr && i < 3) {
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
            const motivoKey = `${med.name}MotivoInterrupcion${i}` as keyof typeof data;
            const motivo = data[motivoKey];
            const agregarKey = `add_${med.name}${i + 1}` as keyof typeof data;

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

      for (const fractura of fracturas) {
        const fechaKey = `frac_rec_date${fractura.num}` as keyof typeof data;
        const localizacionKey = `frac_rec_loc${fractura.num}` as keyof typeof data;
        const frac_rec_hospKey = `frac_rec_hosp${fractura.num}` as keyof typeof data;

        const fecha = data[fechaKey];
        const localizacion = data[localizacionKey];
        const frac_rec_hosp = data[frac_rec_hospKey];

        // Si algún campo está lleno, todos deben estarlo
        const hasSomeData = fecha || localizacion || frac_rec_hosp;
        const hasAllData = fecha && localizacion && frac_rec_hosp;

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
          if (!frac_rec_hosp) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La ${fractura.label} fractura está incompleta. Debe completar la hospitalización o borrar todos los campos (fecha, localización y hospitalización) para eliminarla.`,
              path: [frac_rec_hospKey as string]
            });
          }
        }
      }
    })
});
