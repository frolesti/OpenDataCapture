import { title } from 'process';
import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

// Helper function to make a field conditional on informed consent
function requiresConsent<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['consentimientoInformado'] as const,
    render(data: any): any {
      if (data.consentimientoInformado === 'si') {
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
    deps: ['consentimientoInformado'] as const,
    render(data: any): any {
      if (data.consentimientoInformado !== 'si') {
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

// Helper function to make a field conditional on osteoporosis diagnosis
function requiresDiagnosis<T extends Record<string, any>>(field: T): any {
  return {
    kind: 'dynamic' as const,
    deps: ['consentimientoInformado', 'pacienteDiagnosticado'] as const,
    render(data: any): any {
      if (data.consentimientoInformado === 'si' && data.pacienteDiagnosticado === 'si') {
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
    deps: ['consentimientoInformado', treatmentName] as const,
    render(data: any): any {
      if (data.consentimientoInformado === 'si' && data[treatmentName] === 'si') {
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
    deps: ['consentimientoInformado', 'pacienteCompletoEstudio'] as const,
    render(data: any): any {
      if (data.consentimientoInformado === 'si' && data.pacienteCompletoEstudio === 'no') {
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
    deps: ['consentimientoInformado', 'pacienteCompletoEstudio', 'motivoNoCompletado'] as const,
    render(data: any): any {
      if (
        data.consentimientoInformado === 'si' &&
        data.pacienteCompletoEstudio === 'no' &&
        data.motivoNoCompletado === 'otro'
      ) {
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
      'consentimientoInformado',
      `fechaFractura${fractureNumber - 1}`,
      `localizacionFractura${fractureNumber - 1}`,
      `hospitalizacion${fractureNumber - 1}`,
      `agregarFractura${fractureNumber}`
    ] as const,
    render(data: any): any {
      if (fractureNumber === 1) {
        // First fracture always shows if consent is given
        if (data.consentimientoInformado === 'si') {
          return field;
        }
        return null;
      }

      // For subsequent fractures, check if:
      // 1. Previous fracture is completed (all 3 fields)
      // 2. User wants to add this fracture
      const prevFechaKey = `fechaFractura${fractureNumber - 1}`;
      const prevLocalizacionKey = `localizacionFractura${fractureNumber - 1}`;
      const prevHospitalizacionKey = `hospitalizacion${fractureNumber - 1}`;
      const agregarKey = `agregarFractura${fractureNumber}`;

      const isPreviousComplete = data[prevFechaKey] && data[prevLocalizacionKey] && data[prevHospitalizacionKey];

      // Show if previous is complete AND user said yes to adding this fracture
      if (data.consentimientoInformado === 'si' && isPreviousComplete && data[agregarKey] === 'si') {
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
      'consentimientoInformado',
      `fechaFractura${fractureNumber}`,
      `localizacionFractura${fractureNumber}`,
      `hospitalizacion${fractureNumber}`
    ] as const,
    render(data: any): any {
      const fechaKey = `fechaFractura${fractureNumber}`;
      const localizacionKey = `localizacionFractura${fractureNumber}`;
      const hospitalizacionKey = `hospitalizacion${fractureNumber}`;

      // Show button only if current fracture is complete
      const isCurrentComplete = data[fechaKey] && data[localizacionKey] && data[hospitalizacionKey];

      if (data.consentimientoInformado === 'si' && isCurrentComplete && fractureNumber < 5) {
        return {
          kind: 'string' as const,
          label: `¿Desea agregar ${fractureNumber === 1 ? 'una segunda' : fractureNumber === 2 ? 'una tercera' : fractureNumber === 3 ? 'una cuarta' : 'una quinta'} fractura?`,
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
  const fechaInicioKey = `${medicationName}FechaInicio${treatmentNumber}`;
  const continuaKey = `${medicationName}Continua${treatmentNumber}`;

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
    const fechaFinKey = `${medicationName}FechaFin${treatmentNumber}`;
    const motivoKey = `${medicationName}MotivoInterrupcion${treatmentNumber}`;
    return !!(data[fechaFinKey] && data[motivoKey]);
  }

  return false;
}

// Helper function to show "Add another treatment?" button for medications
function showAddMedicationButton(medicationName: string, medicationLabel: string, treatmentNumber: number): any {
  return {
    kind: 'dynamic' as const,
    deps: [
      'consentimientoInformado',
      `${medicationName}FechaInicio${treatmentNumber}`,
      `${medicationName}Continua${treatmentNumber}`,
      `${medicationName}FechaFin${treatmentNumber}`,
      `${medicationName}MotivoInterrupcion${treatmentNumber}`
    ] as const,
    render(data: any): any {
      if (
        data.consentimientoInformado === 'si' &&
        isMedicationTreatmentComplete(data, medicationName, treatmentNumber)
      ) {
        return {
          kind: 'string' as const,
          label: `¿Desea agregar ${treatmentNumber === 1 ? 'un segundo' : treatmentNumber === 2 ? 'un tercer' : 'otro'} tratamiento de ${medicationLabel}?`,
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
      'consentimientoInformado',
      `${medicationName}FechaInicio${treatmentNumber - 1}`,
      `${medicationName}Continua${treatmentNumber - 1}`,
      `${medicationName}FechaFin${treatmentNumber - 1}`,
      `${medicationName}MotivoInterrupcion${treatmentNumber - 1}`,
      `agregarTratamiento${medicationName}${treatmentNumber}`
    ] as const,
    render(data: any): any {
      if (treatmentNumber === 1) {
        // First treatment always shows if consent is given
        if (data.consentimientoInformado === 'si') {
          return field;
        }
        return null;
      }

      // For subsequent treatments, check if:
      // 1. Previous treatment is completed
      // 2. User wants to add this treatment
      const agregarKey = `agregarTratamiento${medicationName}${treatmentNumber}`;
      const isPreviousComplete = isMedicationTreatmentComplete(data, medicationName, treatmentNumber - 1);

      if (data.consentimientoInformado === 'si' && isPreviousComplete && data[agregarKey] === 'si') {
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
    deps: ['consentimientoInformado', `${medicationName}FechaInicio${treatmentNumber}`] as const,
    render(data: any): any {
      const startDateKey = `${medicationName}FechaInicio${treatmentNumber}`;
      if (data.consentimientoInformado === 'si' && data[startDateKey]) {
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
      'consentimientoInformado',
      `${medicationName}FechaInicio${treatmentNumber}`,
      `${medicationName}Continua${treatmentNumber}`
    ] as const,
    render(data: any): any {
      const startDateKey = `${medicationName}FechaInicio${treatmentNumber}`;
      const continuaKey = `${medicationName}Continua${treatmentNumber}`;
      if (data.consentimientoInformado === 'si' && data[startDateKey] && data[continuaKey] === 'no') {
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
    fields[`${medicationName}FechaInicio${i}`] = requiresPreviousMedicationTreatment(
      {
        kind: 'date',
        label: `${treatmentLabel} - Fecha inicio`
      },
      medicationName,
      i
    );

    // Continúa
    fields[`${medicationName}Continua${i}`] = requiresMedicationStartDate(
      {
        kind: 'string',
        label: `${treatmentLabel} - Continúa`,
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
    fields[`${medicationName}FechaFin${i}`] = requiresMedicationDiscontinuation(
      {
        kind: 'date',
        label: `${treatmentLabel} - Fecha fin`
      },
      medicationName,
      i
    );

    // Motivo interrupción
    fields[`${medicationName}MotivoInterrupcion${i}`] = requiresMedicationDiscontinuation(
      {
        kind: 'string',
        label: `${treatmentLabel} - Motivo interrupción`,
        variant: 'select',
        options: motivoOptions
      },
      medicationName,
      i
    );

    // Add treatment button (except for last treatment)
    if (i < maxTreatments) {
      fields[`agregarTratamiento${medicationName}${i + 1}`] = showAddMedicationButton(
        medicationName,
        medicationLabel,
        i
      );
    }
  }

  return fields;
}

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
    schemas[`${medicationName}FechaInicio${i}`] = z.date().optional();
    schemas[`${medicationName}Continua${i}`] = z.enum(['si', 'no']).optional();
    schemas[`${medicationName}FechaFin${i}`] = z.date().optional();
    schemas[`${medicationName}MotivoInterrupcion${i}`] = motivoEnum.optional();

    if (i < maxTreatments) {
      schemas[`agregarTratamiento${medicationName}${i + 1}`] = z.enum(['si', 'no']).optional();
    }
  }

  return schemas;
}

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Osteoporosis', 'Primary Care'],
  internal: {
    edition: 6,
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
        codigoPaciente: {
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
        consentimientoInformado: {
          kind: 'string',
          variant: 'radio',
          label: '¿El paciente ha firmado el consentimiento informado? *',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        fechaConsentimiento: {
          kind: 'date',
          label: 'Fecha de obtención del consentimiento informado firmado *',
          description: 'Fecha en la que el paciente firma el consentimiento informado'
        }
      }
    },
    {
      title: 'CRITERIOS DE SELECCIÓN',
      description:
        'Criterios de inclusión - Todos los criterios de inclusión deben ser SÍ para que el paciente sea apto para el estudio',
      fields: {
        _warningCriteriosSeleccion: consentWarning() as any,
        criterioInclusion1: requiresConsent({
          kind: 'string',
          label:
            '1. Adultos ≥ 50 años, con antecedentes de historia de al menos una fractura por fragilidad* (evento índice) (ICD Código ICD-9 y ICD-10) ocurrida entre enero de 2021 y diciembre de 2023 *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioInclusion2: requiresConsent({
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
      title: 'CRITERIOS DE SELECCIÓN',
      description:
        'Criterios de exclusión - Todos los criterios de exclusión deben ser NO para que el paciente sea apto para el estudio',
      fields: {
        _warningCriteriosSeleccion: consentWarning() as any,
        criterioExclusion1: requiresConsent({
          kind: 'string',
          label: '1. Pacientes sin otorgar el consentimiento informado *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion2: requiresConsent({
          kind: 'string',
          label:
            '2. Pacientes cuya historia clínica presenta documentación incompleta o carece de información relevante necesaria para la correcta valoración de los resultados del estudio *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes con una fractura debida a un traumatismo de alta o moderada intensidad (p. accidente automoví) y otras fracturas poco probables de estar relacionadas con la osteoporosis (dedos de las manos y pies y huesos de la cara) *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion4: requiresConsent({
          kind: 'string',
          label: '4. Participación previa en otro estudio en el último año *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        })
      }
    },
    {
      title: 'CARACTERIZACIÓN DEL PACIENTE EN EL MOMENTO DE LA FRACTURA ÍNDICE',
      description:
        'Centro de Atención Primaria y datos demográficos y clínicos en el moment de la fractura por fragilidad índice',
      fields: {
        _warningCaracterizacion: consentWarning() as any,
        centroAtencionPrimaria: requiresConsent({
          kind: 'string',
          label: '¿Cuál es el centro de atención primaria dónde se visita el paciente? *',
          variant: 'input'
        }),
        sexoPaciente: requiresConsent({
          kind: 'string',
          label: 'Indique el sexo del paciente *',
          variant: 'radio',
          options: {
            masculino: 'Masculino',
            femenino: 'Femenino'
          }
        }),
        edadPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique la edad del paciente (años) *',
          variant: 'input'
        }),
        pesoPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique el peso (kg) *',
          variant: 'input'
        }),
        alturaPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique la altura (cm) *',
          variant: 'input'
        }),
        observaCifosis: requiresConsent({
          kind: 'string',
          label: '¿Se observa cifosis? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        perdidaAlturaDocumentada: requiresConsent({
          kind: 'string',
          label: '¿Existe pérdida de altura documentada respecto a talla previa? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        estiloVida: requiresConsent({
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
        imcMenor20: requiresConsent({
          kind: 'boolean',
          label: 'IMC (< 20 kg/m²)',
          variant: 'checkbox'
        }),
        etnicidadBlancaCaucasica: requiresConsent({
          kind: 'boolean',
          label: 'Etnicidad (paciente blanco/a caucásico/a)',
          variant: 'checkbox'
        }),
        menopausiaPrecoz: requiresConsent({
          kind: 'boolean',
          label: 'Menopausia precoz (<45 años)',
          variant: 'checkbox'
        }),
        fracturaPrevia: requiresConsent({
          kind: 'boolean',
          label: 'Fractura previa',
          variant: 'checkbox'
        }),
        antecedenteFracturaPaternoMaterno: requiresConsent({
          kind: 'boolean',
          label: 'Antecedente paterno/materno de fractura femoral',
          variant: 'checkbox'
        }),
        tabaquismoActivo: requiresConsent({
          kind: 'boolean',
          label: 'Tabaquismo activo',
          variant: 'checkbox'
        }),
        ingestaAlcohol: requiresConsent({
          kind: 'boolean',
          label: 'Ingesta de alcohol ≥3 unidades/día',
          variant: 'checkbox'
        }),
        nutricionPobre: requiresConsent({
          kind: 'boolean',
          label:
            'Nutrición pobre - dieta baja en calcio (definiéndose como ingesta baja en calcio un aporte de < 3 unidades de calcio diarias: siendo 1 vaso de leche, 1 yogur o 40 g de queso 1 unidad)',
          variant: 'checkbox'
        }),
        medicamentosAsociados: requiresConsent({
          kind: 'boolean',
          label:
            'Medicamentos asociados (glucocorticoides orales, inhibidores de la aromatasa, análogos de la GnRH, anticonvulsivos, inhibidores de la bomba de protones, fármacos antihipertensivos y estatinas)',
          variant: 'checkbox'
        })
      }
    },
    {
      title: 'COMORBILIDADES (en el momento de la fractura por fragilidad índice)',
      fields: {
        _warningComorbilidades: consentWarning() as any,
        artritisReumatoide: requiresConsent({
          kind: 'boolean',
          label: 'Artritis reumatoide',
          variant: 'checkbox'
        }),
        otrasArtritisInflamatorias: requiresConsent({
          kind: 'boolean',
          label: 'Otras artritis inflamatorias',
          variant: 'checkbox'
        }),
        lupusEritematoso: requiresConsent({
          kind: 'boolean',
          label: 'Lupus eritematoso sistémico',
          variant: 'checkbox'
        }),
        hiperparatiroidismo: requiresConsent({
          kind: 'boolean',
          label: 'Hiperparatiroidismo',
          variant: 'checkbox'
        }),
        hipertiroidismo: requiresConsent({
          kind: 'boolean',
          label: 'Hipertiroidismo',
          variant: 'checkbox'
        }),
        hipercortisolismo: requiresConsent({
          kind: 'boolean',
          label: 'Hipercortisolismo/Cushing',
          variant: 'checkbox'
        }),
        diabetes: requiresConsent({
          kind: 'boolean',
          label: 'Diabetes (tipos 1 y 2)',
          variant: 'checkbox'
        }),
        enfermedadInflamatoriaIntestinal: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad inflamatoria intestinal',
          variant: 'checkbox'
        }),
        malnutricion: requiresConsent({
          kind: 'boolean',
          label: 'Malnutrición',
          variant: 'checkbox'
        }),
        nutricionParenteral: requiresConsent({
          kind: 'boolean',
          label: 'Nutrición parenteral',
          variant: 'checkbox'
        }),
        mielomaMultiple: requiresConsent({
          kind: 'boolean',
          label: 'Mieloma múltiple',
          variant: 'checkbox'
        }),
        otrosTrastornosMedulares: requiresConsent({
          kind: 'boolean',
          label: 'Otros trastornos medulares',
          variant: 'checkbox'
        }),
        epoc: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad pulmonar obstructiva crónica (EPOC)',
          variant: 'checkbox'
        }),
        enfermedadRenalCronica: requiresConsent({
          kind: 'boolean',
          label: 'Enfermedad renal crónica (ERC)',
          variant: 'checkbox'
        })
      }
    },
    {
      title: 'EPISODIO DE LA FRACTURA POR FRAGILIDAD',
      description:
        'Complete la información de cada fractura por fragilidad. Después de completar una fractura, podrá elegir si desea agregar otra.',
      fields: {
        _warningFractura: consentWarning() as any,
        // Primera fractura
        fechaFractura1: requiresPreviousFracture(
          {
            kind: 'date',
            label: 'Fecha de la Fractura por Fragilidad *'
          },
          1
        ),
        localizacionFractura1: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización - Elegir una opción *',
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
        hospitalizacion1: requiresPreviousFracture(
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
        agregarFractura2: showAddFractureButton(1),
        // Segunda fractura
        fechaFractura2: requiresPreviousFracture(
          {
            kind: 'date',
            label: 'Fecha de la FF (segunda fractura)'
          },
          2
        ),
        localizacionFractura2: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización - Elegir una opción',
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
        hospitalizacion2: requiresPreviousFracture(
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
        agregarFractura3: showAddFractureButton(2),
        // Tercera fractura
        fechaFractura3: requiresPreviousFracture(
          {
            kind: 'date',
            label: 'Fecha de la FF (tercera fractura)'
          },
          3
        ),
        localizacionFractura3: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización - Elegir una opción',
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
        hospitalizacion3: requiresPreviousFracture(
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
        agregarFractura4: showAddFractureButton(3),
        // Cuarta fractura
        fechaFractura4: requiresPreviousFracture(
          {
            kind: 'date',
            label: 'Fecha de la FF (cuarta fractura)'
          },
          4
        ),
        localizacionFractura4: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización - Elegir una opción',
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
        hospitalizacion4: requiresPreviousFracture(
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
        agregarFractura5: showAddFractureButton(4),
        // Quinta fractura
        fechaFractura5: requiresPreviousFracture(
          {
            kind: 'date',
            label: 'Fecha de la FF (quinta fractura)'
          },
          5
        ),
        localizacionFractura5: requiresPreviousFracture(
          {
            kind: 'string',
            label: 'Localización - Elegir una opción',
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
        hospitalizacion5: requiresPreviousFracture(
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
        )
      }
    },
    {
      title: 'DIAGNÓSTICO DE OSTEOPOROSIS',
      fields: {
        _warningDiagnostico: consentWarning() as any,
        pacienteDiagnosticado: requiresConsent({
          kind: 'string',
          label: '¿El paciente está diagnosticado de osteoporosis? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        fechaDiagnostico: requiresDiagnosis({
          kind: 'date',
          label: '¿Cuál fue la fecha en la que tuvo lugar el diagnóstico? *'
        }),
        metodoDiagnostico: requiresDiagnosis({
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
        otroMetodoEspecificar: {
          kind: 'dynamic' as const,
          deps: ['pacienteDiagnosticado', 'metodoDiagnostico'] as const,
          render(data: any) {
            if (data.pacienteDiagnosticado === 'si' && data.metodoDiagnostico === 'otro') {
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
      fields: {
        _warningTratamiento: consentWarning() as any,
        // All medications with up to 3 treatments each
        ...generateMedicationFields('alendronato', 'Alendronato'),
        ...generateMedicationFields('risedronato', 'Risedronato'),
        ...generateMedicationFields('ibandronato', 'Ibandronato'),
        ...generateMedicationFields('zoledronato', 'Zoledronato'),
        ...generateMedicationFields('denosumab', 'Denosumab'),
        ...generateMedicationFields('raloxifeno', 'Raloxifeno'),
        ...generateMedicationFields('bazedoxifeno', 'Bazedoxifeno'),
        ...generateMedicationFields('tibolona', 'Tibolona'),
        ...generateMedicationFields('teriparatida', 'Teriparatida'),
        ...generateMedicationFields('abaloparatida', 'Abaloparatida'),
        ...generateMedicationFields('romosozumab', 'Romosozumab')
      }
    },
    {
      title: 'TRATAMIENTO NO FARMACOLÓGICO OSTEOPOROSIS',
      fields: {
        _warningTratamientoNoFarmacologico: consentWarning() as any,
        ejercicioFisico: requiresConsent({
          kind: 'string',
          label: 'Ejercicio físico - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        ejercicioFisicoContinua: requiresRecibido(
          {
            kind: 'string',
            label: 'Ejercicio físico - Continúa',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'ejercicioFisico'
        ),
        suplementosCalcioVitaminaD: requiresConsent({
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        suplementosCalcioVitaminaDContinua: requiresRecibido(
          {
            kind: 'string',
            label: 'Suplementos de calcio / vitamina D - Continúa',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'suplementosCalcioVitaminaD'
        ),
        dejarFumar: requiresConsent({
          kind: 'string',
          label: 'Dejar de fumar - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        dejarFumarContinua: requiresRecibido(
          {
            kind: 'string',
            label: 'Dejar de fumar - Continúa',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'dejarFumar'
        ),
        reduccionConsumoAlcohol: requiresConsent({
          kind: 'string',
          label: 'Reducción de consumo de alcohol - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        reduccionConsumoAlcoholContinua: requiresRecibido(
          {
            kind: 'string',
            label: 'Reducción de consumo de alcohol - Continúa',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'reduccionConsumoAlcohol'
        ),
        protectoresCadera: requiresConsent({
          kind: 'string',
          label: 'Protectores de cadera - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        protectoresCaderaContinua: requiresRecibido(
          {
            kind: 'string',
            label: 'Protectores de cadera - Continúa',
            variant: 'radio',
            options: {
              si: 'Sí',
              no: 'No'
            }
          },
          'protectoresCadera'
        ),
        otroTratamiento: requiresConsent({
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
        fechaFinEstudio: requiresConsent({
          kind: 'date',
          label: '¿Fecha en que se rellena el formulario de fin de estudio? *'
        }),
        pacienteCompletoEstudio: requiresConsent({
          kind: 'string',
          label: '¿Ha completado el paciente el estudio? *',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        motivoNoCompletado: requiresStudyNotCompleted({
          kind: 'string',
          label: 'En caso negativo, indique el motivo *',
          variant: 'radio',
          options: {
            decisionInvestigador: 'Decisión del investigador',
            decisionPaciente: 'Decisión del paciente',
            otro: 'Otro'
          }
        }),
        otroMotivoEspecificar: requiresOtroMotivo({
          kind: 'string',
          label: 'Otro motivo (especificar): *',
          variant: 'input'
        }),
        inicialesFinEstudio: requiresConsent({
          kind: 'string',
          label: 'Iniciales del profesional sanitario *',
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
    imc: {
      kind: 'computed',
      label: 'Índice de Masa Corporal',
      value: (data) => {
        if (data.pesoPaciente && data.alturaPaciente) {
          const peso = data.pesoPaciente;
          const altura = data.alturaPaciente;

          if (altura === 0) {
            return undefined;
          }

          const alturaMetros = altura / 100;
          return Math.round((peso / (alturaMetros * alturaMetros)) * 100) / 100;
        }
        return undefined;
      }
    },
    cumpleCriteriosInclusion: {
      kind: 'computed',
      label: 'Cumple Criterios de Inclusión',
      value: (data) => {
        return data.criterioInclusion1 && data.criterioInclusion2;
      }
    },
    cumpleCriteriosExclusion: {
      kind: 'computed',
      label: 'Presenta Criterios de Exclusión',
      value: (data) => {
        return data.criterioExclusion1 || data.criterioExclusion2 || data.criterioExclusion3 || data.criterioExclusion4;
      }
    }
  },
  validationSchema: z
    .object({
      // SELECCIÓN DEL PACIENTE
      codigoPaciente: z.string().min(1, 'El código del paciente es obligatorio'),
      consentimientoInformado: z.enum(['si', 'no']).refine((val) => val === 'si', {
        message: 'El consentimiento informado debe ser Sí'
      }),
      fechaConsentimiento: z.date(),
      criterioInclusion1: z.enum(['si', 'no']),
      criterioInclusion2: z.enum(['si', 'no']),
      criterioExclusion1: z.enum(['si', 'no']),
      criterioExclusion2: z.enum(['si', 'no']),
      criterioExclusion3: z.enum(['si', 'no']),
      criterioExclusion4: z.enum(['si', 'no']),

      // CARACTERIZACIÓN DEL PACIENTE
      centroAtencionPrimaria: z.string().optional(),
      sexoPaciente: z.enum(['masculino', 'femenino']).optional(),
      edadPaciente: z
        .number()
        .min(50, 'La edad debe ser al menos 50 años')
        .max(120, 'La edad debe ser menor a 120 años')
        .optional(),
      pesoPaciente: z
        .number()
        .min(1, 'El peso debe ser mayor a 0 kg')
        .max(300, 'El peso debe ser menor o igual a 300 kg')
        .optional(),
      alturaPaciente: z
        .number()
        .min(50, 'La altura debe ser al menos 50 cm')
        .max(250, 'La altura debe ser menor o igual a 250 cm')
        .optional(),
      observaCifosis: z.enum(['si', 'no']).optional(),
      perdidaAlturaDocumentada: z.enum(['si', 'no']).optional(),
      estiloVida: z.enum(['sedentario', 'activo', 'equilibrado', 'riesgo']).optional(),
      presentaFactoresRiesgo: z.enum(['si', 'no']).optional(),
      imcMenor20: z.boolean().optional(),
      etnicidadBlancaCaucasica: z.boolean().optional(),
      menopausiaPrecoz: z.boolean().optional(),
      fracturaPrevia: z.boolean().optional(),
      antecedenteFracturaPaternoMaterno: z.boolean().optional(),
      tabaquismoActivo: z.boolean().optional(),
      ingestaAlcohol: z.boolean().optional(),
      nutricionPobre: z.boolean().optional(),
      medicamentosAsociados: z.boolean().optional(),

      // COMORBILIDADES
      artritisReumatoide: z.boolean().optional(),
      otrasArtritisInflamatorias: z.boolean().optional(),
      lupusEritematoso: z.boolean().optional(),
      hiperparatiroidismo: z.boolean().optional(),
      hipertiroidismo: z.boolean().optional(),
      hipercortisolismo: z.boolean().optional(),
      diabetes: z.boolean().optional(),
      enfermedadInflamatoriaIntestinal: z.boolean().optional(),
      malnutricion: z.boolean().optional(),
      nutricionParenteral: z.boolean().optional(),
      mielomaMultiple: z.boolean().optional(),
      otrosTrastornosMedulares: z.boolean().optional(),
      epoc: z.boolean().optional(),
      enfermedadRenalCronica: z.boolean().optional(),

      // FRACTURA
      fechaFractura1: z.date().optional(),
      localizacionFractura1: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion1: z.enum(['si', 'no']).optional(),
      agregarFractura2: z.enum(['si', 'no']).optional(),
      fechaFractura2: z.date().optional(),
      localizacionFractura2: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion2: z.enum(['si', 'no']).optional(),
      agregarFractura3: z.enum(['si', 'no']).optional(),
      fechaFractura3: z.date().optional(),
      localizacionFractura3: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion3: z.enum(['si', 'no']).optional(),
      agregarFractura4: z.enum(['si', 'no']).optional(),
      fechaFractura4: z.date().optional(),
      localizacionFractura4: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion4: z.enum(['si', 'no']).optional(),
      agregarFractura5: z.enum(['si', 'no']).optional(),
      fechaFractura5: z.date().optional(),
      localizacionFractura5: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion5: z.enum(['si', 'no']).optional(),

      // DIAGNÓSTICO
      pacienteDiagnosticado: z.enum(['si', 'no']).optional(),
      fechaDiagnostico: z.date().optional(),
      metodoDiagnostico: z.enum(['dxa', 'clinico', 'frax', 'hallazgo', 'presuntivo', 'otro']).optional(),
      otroMetodoEspecificar: z.string().optional(),

      // TRATAMIENTOS (todos opcionales)
      ...generateMedicationValidationSchemas('alendronato'),
      ...generateMedicationValidationSchemas('risedronato'),
      ...generateMedicationValidationSchemas('ibandronato'),
      ...generateMedicationValidationSchemas('zoledronato'),
      ...generateMedicationValidationSchemas('denosumab'),
      ...generateMedicationValidationSchemas('raloxifeno'),
      ...generateMedicationValidationSchemas('bazedoxifeno'),
      ...generateMedicationValidationSchemas('tibolona'),
      ...generateMedicationValidationSchemas('teriparatida'),
      ...generateMedicationValidationSchemas('abaloparatida'),
      ...generateMedicationValidationSchemas('romosozumab'),

      // TRATAMIENTO NO FARMACOLÓGICO
      ejercicioFisico: z.enum(['si', 'no']).optional(),
      ejercicioFisicoContinua: z.enum(['si', 'no']).optional(),
      suplementosCalcioVitaminaD: z.enum(['si', 'no']).optional(),
      suplementosCalcioVitaminaDContinua: z.enum(['si', 'no']).optional(),
      dejarFumar: z.enum(['si', 'no']).optional(),
      dejarFumarContinua: z.enum(['si', 'no']).optional(),
      reduccionConsumoAlcohol: z.enum(['si', 'no']).optional(),
      reduccionConsumoAlcoholContinua: z.enum(['si', 'no']).optional(),
      protectoresCadera: z.enum(['si', 'no']).optional(),
      protectoresCaderaContinua: z.enum(['si', 'no']).optional(),
      otroTratamiento: z.string().optional(),

      // FIN DE ESTUDIO
      fechaFinEstudio: z.date().optional(),
      pacienteCompletoEstudio: z.enum(['si', 'no']).optional(),
      motivoNoCompletado: z.enum(['decisionInvestigador', 'decisionPaciente', 'otro']).optional(),
      otroMotivoEspecificar: z.string().optional(),
      inicialesFinEstudio: z.string().optional()
    })
    .superRefine((data, ctx) => {
      // Validar que fecha inicio no sea mayor que fecha fin para todos los tratamientos
      const medications = [
        { name: 'alendronato', label: 'Alendronato' },
        { name: 'risedronato', label: 'Risedronato' },
        { name: 'ibandronato', label: 'Ibandronato' },
        { name: 'zoledronato', label: 'Zoledronato' },
        { name: 'denosumab', label: 'Denosumab' },
        { name: 'raloxifeno', label: 'Raloxifeno' },
        { name: 'bazedoxifeno', label: 'Bazedoxifeno' },
        { name: 'tibolona', label: 'Tibolona' },
        { name: 'teriparatida', label: 'Teriparatida' },
        { name: 'abaloparatida', label: 'Abaloparatida' },
        { name: 'romosozumab', label: 'Romosozumab' }
      ];

      for (const med of medications) {
        const fechaInicioKey = `${med.name}FechaInicio` as keyof typeof data;
        const fechaFinKey = `${med.name}FechaFin` as keyof typeof data;
        const fechaInicio = data[fechaInicioKey] as Date | undefined;
        const fechaFin = data[fechaFinKey] as Date | undefined;

        if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La fecha de inicio no puede ser posterior a la fecha de fin`,
            path: [fechaFinKey as string]
          });
        }
      }

      // Validar que si una fractura tiene algún campo rellenado, debe tener todos los campos obligatorios
      const fracturas = [
        { num: 1, label: 'primera' },
        { num: 2, label: 'segunda' },
        { num: 3, label: 'tercera' },
        { num: 4, label: 'cuarta' },
        { num: 5, label: 'quinta' }
      ];

      for (const fractura of fracturas) {
        const fechaKey = `fechaFractura${fractura.num}` as keyof typeof data;
        const localizacionKey = `localizacionFractura${fractura.num}` as keyof typeof data;
        const hospitalizacionKey = `hospitalizacion${fractura.num}` as keyof typeof data;

        const fecha = data[fechaKey];
        const localizacion = data[localizacionKey];
        const hospitalizacion = data[hospitalizacionKey];

        // Si algún campo está lleno, todos deben estarlo
        const hasSomeData = fecha || localizacion || hospitalizacion;
        const hasAllData = fecha && localizacion && hospitalizacion;

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
          if (!hospitalizacion) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `La ${fractura.label} fractura está incompleta. Debe completar la hospitalización o borrar todos los campos (fecha, localización y hospitalización) para eliminarla.`,
              path: [hospitalizacionKey as string]
            });
          }
        }
      }
    })
});
