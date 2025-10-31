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

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Osteoporosis', 'Primary Care'],
  internal: {
    edition: 4,
    name: 'OMEGA_FF_AP_2025'
  },
  content: [
    {
      title: 'CUADERNO DE RECOGIDA DE DATOS',
      description:
        'Evaluación del tratamiento antiosteoporótico posterior a fractura por fragilidad en Atención Primaria: estudio transversal',
      fields: {
        codigoPaciente: {
          kind: 'string',
          label: 'CÓDIGO DEL PACIENTE',
          variant: 'input'
        },
        consentimientoInformado: {
          kind: 'string',
          label: 'CONSENTIMIENTO INFORMADO - ¿El paciente ha firmado el consentimiento informado?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        } as any,
        fechaConsentimiento: {
          kind: 'date',
          label: 'FECHA DE OBTENCIÓN DEL CONSENTIMIENTO INFORMADO FIRMADO',
          description: 'Fecha en la que el paciente firma el consentimiento informado'
        }
      }
    },
    {
      title: 'CRITERIOS DE SELECCIÓN',
      fields: {
        _warningCriteriosSeleccion: consentWarning() as any,
        criterioInclusion1: requiresConsent({
          kind: 'string',
          label:
            'Criterios de INCLUSIÓN - 1. Adultos ≥ 50 años, con antecedentes de historia de al menos una fractura por fragilidad* (evento índice) (ICD Código ICD-9 y ICD-10) ocurrida entre enero de 2021 y diciembre de 2023',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioInclusion2: requiresConsent({
          kind: 'string',
          label:
            '2. Los pacientes deben haber otorgado su consentimiento informado para la recopilación y el uso de los datos clínicos contenidos en su historia médica',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        notaInclusion: requiresConsent({
          kind: 'string',
          label: 'Todos los criterios de inclusión deben ser SI para que el paciente sea apto para el estudio',
          variant: 'input',
          disabled: true
        }),
        criterioExclusion1: requiresConsent({
          kind: 'string',
          label: 'Criterios de EXCLUSIÓN - 1. Pacientes sin otorgar el consentimiento informado',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion2: requiresConsent({
          kind: 'string',
          label:
            '2. Pacientes cuya historia clínica presenta documentación incompleta o carece de información relevante necesaria para la correcta valoración de los resultados del estudio',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion3: requiresConsent({
          kind: 'string',
          label:
            '3. Pacientes con una fractura debida a un traumatismo de alta o moderada intensidad (p. accidente automoví) y otras fracturas poco probables de estar relacionadas con la osteoporosis (dedos de las manos y pies y huesos de la cara)',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        criterioExclusion4: requiresConsent({
          kind: 'string',
          label: '4. Participación previa en otro estudio en el último año',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        notaExclusion: requiresConsent({
          kind: 'string',
          label: 'Todos los criterios de exclusión deben ser NO para que el paciente sea apto para el estudio',
          variant: 'input',
          disabled: true
        })
      }
    },
    {
      title: 'CARACTERIZACIÓN DEL PACIENTE EN EL MOMENTO DE LA FRACTURA ÍNDICE',
      fields: {
        _warningCaracterizacion: consentWarning() as any,
        centroAtencionPrimaria: requiresConsent({
          kind: 'string',
          label: 'CENTRO DE ATENCIÓN PRIMARIA - ¿Cuál es el centro de atención primaria dónde se visita el paciente?',
          variant: 'input'
        }),
        sexoPaciente: requiresConsent({
          kind: 'string',
          label:
            'DATOS DEMOGRÁFICOS Y CLÍNICOS (en el momento de la fractura por fragilidad índice) - Indique el sexo del paciente',
          variant: 'radio',
          options: {
            masculino: 'Masculino',
            femenino: 'Femenino'
          }
        }),
        edadPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique la edad del paciente (años)',
          variant: 'input'
        }),
        pesoPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique el peso (kg)',
          variant: 'input'
        }),
        alturaPaciente: requiresConsent({
          kind: 'number',
          label: 'Indique la altura (cm)',
          variant: 'input'
        }),
        observaCifosis: requiresConsent({
          kind: 'string',
          label: '¿Se observa cifosis?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        perdidaAlturaDocumentada: requiresConsent({
          kind: 'string',
          label: '¿Existe pérdida de altura documentada respecto a talla previa?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        estiloVida: requiresConsent({
          kind: 'string',
          label: 'Indique el estilo de vida que se ajuste más al paciente',
          variant: 'radio',
          options: {
            sedentario: 'Estilo de vida sedentario',
            activo: 'Estilo de vida activo',
            equilibrado: 'Estilo de vida equilibrado',
            riesgo: 'Estilo de vida con hábitos de riesgo'
          }
        }),
        presentaFactoresRiesgo: requiresConsent({
          kind: 'string',
          label:
            'FACTORES DE RIESGO (en el momento de la fractura por fragilidad índice) - ¿El paciente presenta alguno de los siguientes factores de riesgo?',
          variant: 'input',
          disabled: true
        }),
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
      fields: {
        _warningFractura: consentWarning() as any,
        // Primera fractura
        fechaFractura1: requiresConsent({
          kind: 'date',
          label: 'Fecha de la Fractura por Fragilidad'
        }),
        localizacionFractura1: requiresConsent({
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
        }),
        hospitalizacion1: requiresConsent({
          kind: 'string',
          label: '¿Requirió hospitalización?',
          variant: 'select',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        // Segunda fractura
        fechaFractura2: requiresConsent({
          kind: 'date',
          label: 'Fecha de la FF (segunda fractura)'
        }),
        localizacionFractura2: requiresConsent({
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
        }),
        hospitalizacion2: requiresConsent({
          kind: 'string',
          label: '¿Requirió hospitalización? (segunda fractura)',
          variant: 'select',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        // Tercera fractura
        fechaFractura3: requiresConsent({
          kind: 'date',
          label: 'Fecha de la FF (tercera fractura)'
        }),
        localizacionFractura3: requiresConsent({
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
        }),
        hospitalizacion3: requiresConsent({
          kind: 'string',
          label: '¿Requirió hospitalización? (tercera fractura)',
          variant: 'select',
          options: {
            si: 'Sí',
            no: 'No'
          }
        })
      }
    },
    {
      title: 'DIAGNÓSTICO DE OSTEOPOROSIS',
      fields: {
        _warningDiagnostico: consentWarning() as any,
        pacienteDiagnosticado: requiresConsent({
          kind: 'string',
          label: '¿El paciente está diagnosticado de osteoporosis?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        fechaDiagnostico: requiresDiagnosis({
          kind: 'date',
          label: '¿Cuál fue la fecha en la que tuvo lugar el diagnóstico?'
        }),
        metodoDiagnostico: requiresDiagnosis({
          kind: 'set',
          label: '¿Qué método principal se empleó para el diagnóstico?',
          variant: 'listbox',
          options: {
            dxa: 'Densitometría ósea (DXA)',
            clinico: 'Diagnóstico clínico tras fractura por fragilidad (sin DXA)',
            frax: 'Evaluación de riesgo mediante FRAX u otra escala sin DXA',
            hallazgo: 'Hallazgo radiológico de fracturas',
            presuntivo: 'Diagnóstico presuntivo por antecedentes y factores de riesgo',
            otro: 'Otro'
          }
        }),
        otroMetodoEspecificar: requiresDiagnosis({
          kind: 'string',
          label: 'Otro (especificar):',
          variant: 'input'
        })
      }
    },
    {
      title: 'PRESCRIPCIÓN DEL TRATAMIENTO DE OSTEOPOROSIS',
      fields: {
        _warningTratamiento: consentWarning() as any,
        // Alendronato
        alendronatoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Alendronato - Fecha inicio'
        }),
        alendronatoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Alendronato - Fecha fin'
        }),
        alendronatoContinua: requiresConsent({
          kind: 'string',
          label: 'Alendronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        alendronatoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Alendronato - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Risedronato
        risedronatoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Risedronato - Fecha inicio'
        }),
        risedronatoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Risedronato - Fecha fin'
        }),
        risedronatoContinua: requiresConsent({
          kind: 'string',
          label: 'Risedronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        risedronatoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Risedronato - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Ibandronato
        ibandronatoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Ibandronato - Fecha inicio'
        }),
        ibandronatoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Ibandronato - Fecha fin'
        }),
        ibandronatoContinua: requiresConsent({
          kind: 'string',
          label: 'Ibandronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        ibandronatoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Ibandronato - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Zoledronato
        zoledronatoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Zoledronato - Fecha inicio'
        }),
        zoledronatoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Zoledronato - Fecha fin'
        }),
        zoledronatoContinua: requiresConsent({
          kind: 'string',
          label: 'Zoledronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        zoledronatoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Zoledronato - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Denosumab
        denosumabFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Denosumab - Fecha inicio'
        }),
        denosumabFechaFin: requiresConsent({
          kind: 'date',
          label: 'Denosumab - Fecha fin'
        }),
        denosumabContinua: requiresConsent({
          kind: 'string',
          label: 'Denosumab - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        denosumabMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Denosumab - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Raloxifeno
        raloxifenoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Raloxifeno - Fecha inicio'
        }),
        raloxifenoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Raloxifeno - Fecha fin'
        }),
        raloxifenoContinua: requiresConsent({
          kind: 'string',
          label: 'Raloxifeno - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        raloxifenoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Raloxifeno - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Bazedoxifeno
        bazedoxifenoFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Bazedoxifeno - Fecha inicio'
        }),
        bazedoxifenoFechaFin: requiresConsent({
          kind: 'date',
          label: 'Bazedoxifeno - Fecha fin'
        }),
        bazedoxifenoContinua: requiresConsent({
          kind: 'string',
          label: 'Bazedoxifeno - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        bazedoxifenoMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Bazedoxifeno - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Tibolona
        tibolonaFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Tibolona - Fecha inicio'
        }),
        tibolonaFechaFin: requiresConsent({
          kind: 'date',
          label: 'Tibolona - Fecha fin'
        }),
        tibolonaContinua: requiresConsent({
          kind: 'string',
          label: 'Tibolona - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        tibolonaMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Tibolona - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Teriparatida
        teriparatidaFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Teriparatida - Fecha inicio'
        }),
        teriparatidaFechaFin: requiresConsent({
          kind: 'date',
          label: 'Teriparatida - Fecha fin'
        }),
        teriparatidaContinua: requiresConsent({
          kind: 'string',
          label: 'Teriparatida - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        teriparatidaMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Teriparatida - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Abaloparatida
        abaloparatidaFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Abaloparatida - Fecha inicio'
        }),
        abaloparatidaFechaFin: requiresConsent({
          kind: 'date',
          label: 'Abaloparatida - Fecha fin'
        }),
        abaloparatidaContinua: requiresConsent({
          kind: 'string',
          label: 'Abaloparatida - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        abaloparatidaMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Abaloparatida - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        }),
        // Romosozumab
        romosozumabFechaInicio: requiresConsent({
          kind: 'date',
          label: 'Romosozumab - Fecha inicio'
        }),
        romosozumabFechaFin: requiresConsent({
          kind: 'date',
          label: 'Romosozumab - Fecha fin'
        }),
        romosozumabContinua: requiresConsent({
          kind: 'string',
          label: 'Romosozumab - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        romosozumabMotivoInterrupcion: requiresConsent({
          kind: 'set',
          label: 'Romosozumab - Motivo interrupción',
          variant: 'listbox',
          options: {
            tolerabilidad: 'Problemas de tolerabilidad',
            eficacia: 'Falta de eficacia',
            incumplimiento: 'Incumplimiento',
            cirugias: 'Procedimientos o cirugías dentales',
            investigador: 'Decisión del investigador',
            especialista: 'Decisión del especialista',
            sujeto: 'Decisión del sujeto',
            otros: 'Otros'
          }
        })
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
        ejercicioFisicoContinua: requiresConsent({
          kind: 'string',
          label: 'Ejercicio físico - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        suplementosCalcioVitaminaD: requiresConsent({
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        suplementosCalcioVitaminaDContinua: requiresConsent({
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        dejarFumar: requiresConsent({
          kind: 'string',
          label: 'Dejar de fumar - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        dejarFumarContinua: requiresConsent({
          kind: 'string',
          label: 'Dejar de fumar - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        reduccionConsumoAlcohol: requiresConsent({
          kind: 'string',
          label: 'Reducción de consumo de alcohol - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        reduccionConsumoAlcoholContinua: requiresConsent({
          kind: 'string',
          label: 'Reducción de consumo de alcohol - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        protectoresCadera: requiresConsent({
          kind: 'string',
          label: 'Protectores de cadera - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        protectoresCaderaContinua: requiresConsent({
          kind: 'string',
          label: 'Protectores de cadera - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
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
          label: '¿Fecha en que se rellena el formulario de fin de estudio?'
        }),
        pacienteCompletoEstudio: requiresConsent({
          kind: 'string',
          label: '¿Ha completado el paciente el estudio?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }),
        motivoNoCompletado: requiresConsent({
          kind: 'string',
          label: 'En caso negativo, indique el motivo',
          variant: 'radio',
          options: {
            decisionInvestigador: 'Decisión del investigador',
            decisionPaciente: 'Decisión del paciente',
            otro: 'Otro'
          }
        }),
        otroMotivoEspecificar: requiresConsent({
          kind: 'string',
          label: 'Otro motivo (especificar):',
          variant: 'input'
        }),
        inicialesFinEstudio: requiresConsent({
          kind: 'string',
          label: 'Iniciales del profesional sanitario',
          variant: 'input'
        }),
        firmaFinEstudio: requiresConsent({
          kind: 'string',
          label: 'Firma del profesional sanitario',
          variant: 'input'
        })
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 10,
    instructions: [
      'Complete todos los campos del formulario con la información más precisa posible',
      'Los campos marcados son obligatorios según los criterios de inclusión/exclusión',
      'Utilice las unidades de medida especificadas en cada campo',
      'En caso de duda, consulte con el investigador principal',
      'Asegúrese de verificar los datos antes de enviar el formulario'
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
      notaInclusion: z.string().optional(),
      criterioExclusion1: z.enum(['si', 'no']),
      criterioExclusion2: z.enum(['si', 'no']),
      criterioExclusion3: z.enum(['si', 'no']),
      criterioExclusion4: z.enum(['si', 'no']),
      notaExclusion: z.string().optional(),
      inicialesProfesional: z.string().min(1),
      firmaProfesional: z.string().min(1),

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
      fechaFractura2: z.date().optional(),
      localizacionFractura2: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion2: z.enum(['si', 'no']).optional(),
      fechaFractura3: z.date().optional(),
      localizacionFractura3: z
        .enum(['vertebral', 'femoral', 'humero', 'radioMuneca', 'pelvis', 'costilla', 'tobillopie', 'otras'])
        .optional(),
      hospitalizacion3: z.enum(['si', 'no']).optional(),

      // DIAGNÓSTICO
      pacienteDiagnosticado: z.enum(['si', 'no']).optional(),
      fechaDiagnostico: z.date().optional(),
      metodoDiagnostico: z.set(z.enum(['dxa', 'clinico', 'frax', 'hallazgo', 'presuntivo', 'otro'])).optional(),
      otroMetodoEspecificar: z.string().optional(),

      // TRATAMIENTOS (todos opcionales)
      alendronatoFechaInicio: z.date().optional(),
      alendronatoFechaFin: z.date().optional(),
      alendronatoContinua: z.enum(['si', 'no']).optional(),
      alendronatoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      risedronatoFechaInicio: z.date().optional(),
      risedronatoFechaFin: z.date().optional(),
      risedronatoContinua: z.enum(['si', 'no']).optional(),
      risedronatoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      ibandronatoFechaInicio: z.date().optional(),
      ibandronatoFechaFin: z.date().optional(),
      ibandronatoContinua: z.enum(['si', 'no']).optional(),
      ibandronatoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      zoledronatoFechaInicio: z.date().optional(),
      zoledronatoFechaFin: z.date().optional(),
      zoledronatoContinua: z.enum(['si', 'no']).optional(),
      zoledronatoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      denosumabFechaInicio: z.date().optional(),
      denosumabFechaFin: z.date().optional(),
      denosumabContinua: z.enum(['si', 'no']).optional(),
      denosumabMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      raloxifenoFechaInicio: z.date().optional(),
      raloxifenoFechaFin: z.date().optional(),
      raloxifenoContinua: z.enum(['si', 'no']).optional(),
      raloxifenoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      bazedoxifenoFechaInicio: z.date().optional(),
      bazedoxifenoFechaFin: z.date().optional(),
      bazedoxifenoContinua: z.enum(['si', 'no']).optional(),
      bazedoxifenoMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      tibolonaFechaInicio: z.date().optional(),
      tibolonaFechaFin: z.date().optional(),
      tibolonaContinua: z.enum(['si', 'no']).optional(),
      tibolonaMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      teriparatidaFechaInicio: z.date().optional(),
      teriparatidaFechaFin: z.date().optional(),
      teriparatidaContinua: z.enum(['si', 'no']).optional(),
      teriparatidaMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      abaloparatidaFechaInicio: z.date().optional(),
      abaloparatidaFechaFin: z.date().optional(),
      abaloparatidaContinua: z.enum(['si', 'no']).optional(),
      abaloparatidaMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

      romosozumabFechaInicio: z.date().optional(),
      romosozumabFechaFin: z.date().optional(),
      romosozumabContinua: z.enum(['si', 'no']).optional(),
      romosozumabMotivoInterrupcion: z
        .set(
          z.enum([
            'tolerabilidad',
            'eficacia',
            'incumplimiento',
            'cirugias',
            'investigador',
            'especialista',
            'sujeto',
            'otros'
          ])
        )
        .optional(),

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
      inicialesFinEstudio: z.string().optional(),
      firmaFinEstudio: z.string().optional()
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
    })
});
