import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: 'en',
  tags: ['Clinical Research', 'Osteoporosis', 'Primary Care'],
  internal: {
    edition: 3,
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
        },
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
        criterioInclusion1: {
          kind: 'string',
          label:
            'Criterios de INCLUSIÓN - 1. Adultos ≥ 50 años, con antecedentes de historia de al menos una fractura por fragilidad* (evento índice) (ICD Código ICD-9 y ICD-10) ocurrida entre enero de 2021 y diciembre de 2023',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        criterioInclusion2: {
          kind: 'string',
          label:
            '2. Los pacientes deben haber otorgado su consentimiento informado para la recopilación y el uso de los datos clínicos contenidos en su historia médica',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        notaInclusion: {
          kind: 'string',
          label: 'Todos los criterios de inclusión deben ser SI para que el paciente sea apto para el estudio',
          variant: 'input',
          disabled: true,
          description: 'Nota informativa'
        },
        criterioExclusion1: {
          kind: 'string',
          label: 'Criterios de EXCLUSIÓN - 1. Pacientes sin otorgar el consentimiento informado',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        criterioExclusion2: {
          kind: 'string',
          label:
            '2. Pacientes cuya historia clínica presenta documentación incompleta o carece de información relevante necesaria para la correcta valoración de los resultados del estudio',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        criterioExclusion3: {
          kind: 'string',
          label:
            '3. Pacientes con una fractura debida a un traumatismo de alta o moderada intensidad (p. accidente automoví) y otras fracturas poco probables de estar relacionadas con la osteoporosis (dedos de las manos y pies y huesos de la cara)',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        criterioExclusion4: {
          kind: 'string',
          label: '4. Participación previa en otro estudio en el último año',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        notaExclusion: {
          kind: 'string',
          label: 'Todos los criterios de exclusión deben ser NO para que el paciente sea apto para el estudio',
          variant: 'input',
          disabled: true,
          description: 'Nota informativa'
        },
        inicialesProfesional: {
          kind: 'string',
          label: 'INICIALES Y FIRMA DEL PROFESIONAL SANITARIO QUE HA RELLENADO LOS DATOS - Iniciales',
          variant: 'input'
        },
        firmaProfesional: {
          kind: 'string',
          label: 'Firma',
          variant: 'input'
        }
      }
    },
    {
      title: 'CARACTERIZACIÓN DEL PACIENTE EN EL MOMENTO DE LA FRACTURA ÍNDICE',
      fields: {
        centroAtencionPrimaria: {
          kind: 'string',
          label: 'CENTRO DE ATENCIÓN PRIMARIA - ¿Cuál es el centro de atención primaria dónde se visita el paciente?',
          variant: 'input'
        },
        sexoPaciente: {
          kind: 'string',
          label:
            'DATOS DEMOGRÁFICOS Y CLÍNICOS (en el momento de la fractura por fragilidad índice) - Indique el sexo del paciente',
          variant: 'radio',
          options: {
            masculino: 'Masculino',
            femenino: 'Femenino'
          }
        },
        edadPaciente: {
          kind: 'string',
          label: 'Indique la edad del paciente (años)',
          variant: 'input'
        },
        pesoPaciente: {
          kind: 'string',
          label: 'Indique el peso (kg)',
          variant: 'input'
        },
        alturaPaciente: {
          kind: 'string',
          label: 'Indique la altura (cm)',
          variant: 'input'
        },
        observaCifosis: {
          kind: 'string',
          label: '¿Se observa cifosis?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        perdidaAlturaDocumentada: {
          kind: 'string',
          label: '¿Existe pérdida de altura documentada respecto a talla previa?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        estiloVida: {
          kind: 'string',
          label: 'Indique el estilo de vida que se ajuste más al paciente',
          variant: 'radio',
          options: {
            sedentario: 'Estilo de vida sedentario',
            activo: 'Estilo de vida activo',
            equilibrado: 'Estilo de vida equilibrado',
            riesgo: 'Estilo de vida con hábitos de riesgo'
          }
        },
        presentaFactoresRiesgo: {
          kind: 'string',
          label:
            'FACTORES DE RIESGO (en el momento de la fractura por fragilidad índice) - ¿El paciente presenta alguno de los siguientes factores de riesgo?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        imcMenor20: {
          kind: 'boolean',
          label: 'IMC (< 20 kg/m²)',
          variant: 'checkbox'
        },
        etnicidadBlancaCaucasica: {
          kind: 'boolean',
          label: 'Etnicidad (paciente blanco/a caucásico/a)',
          variant: 'checkbox'
        },
        menopausiaPrecoz: {
          kind: 'boolean',
          label: 'Menopausia precoz (<45 años)',
          variant: 'checkbox'
        },
        fracturaPrevia: {
          kind: 'boolean',
          label: 'Fractura previa',
          variant: 'checkbox'
        },
        antecedenteFracturaPaternoMaterno: {
          kind: 'boolean',
          label: 'Antecedente paterno/materno de fractura femoral',
          variant: 'checkbox'
        },
        tabaquismoActivo: {
          kind: 'boolean',
          label: 'Tabaquismo activo',
          variant: 'checkbox'
        },
        ingestaAlcohol: {
          kind: 'boolean',
          label: 'Ingesta de alcohol ≥3 unidades/día',
          variant: 'checkbox'
        },
        nutricionPobre: {
          kind: 'boolean',
          label:
            'Nutrición pobre - dieta baja en calcio (definiéndose como ingesta baja en calcio un aporte de < 3 unidades de calcio diarias: siendo 1 vaso de leche, 1 yogur o 40 g de queso 1 unidad)',
          variant: 'checkbox'
        },
        medicamentosAsociados: {
          kind: 'boolean',
          label:
            'Medicamentos asociados (glucocorticoides orales, inhibidores de la aromatasa, análogos de la GnRH, anticonvulsivos, inhibidores de la bomba de protones, fármacos antihipertensivos y estatinas)',
          variant: 'checkbox'
        }
      }
    },
    {
      title: 'COMORBILIDADES (en el momento de la fractura por fragilidad índice)',
      description: '¿El paciente presenta alguna de las siguientes comorbilidades?',
      fields: {
        artritisReumatoide: {
          kind: 'boolean',
          label: 'Artritis reumatoide',
          variant: 'checkbox'
        },
        otrasArtritisInflamatorias: {
          kind: 'boolean',
          label: 'Otras artritis inflamatorias',
          variant: 'checkbox'
        },
        lupusEritematoso: {
          kind: 'boolean',
          label: 'Lupus eritematoso sistémico',
          variant: 'checkbox'
        },
        hiperparatiroidismo: {
          kind: 'boolean',
          label: 'Hiperparatiroidismo',
          variant: 'checkbox'
        },
        hipertiroidismo: {
          kind: 'boolean',
          label: 'Hipertiroidismo',
          variant: 'checkbox'
        },
        hipercortisolismo: {
          kind: 'boolean',
          label: 'Hipercortisolismo/Cushing',
          variant: 'checkbox'
        },
        diabetes: {
          kind: 'boolean',
          label: 'Diabetes (tipos 1 y 2)',
          variant: 'checkbox'
        },
        enfermedadInflamatoriaIntestinal: {
          kind: 'boolean',
          label: 'Enfermedad inflamatoria intestinal',
          variant: 'checkbox'
        },
        malnutricion: {
          kind: 'boolean',
          label: 'Malnutrición',
          variant: 'checkbox'
        },
        nutricionParenteral: {
          kind: 'boolean',
          label: 'Nutrición parenteral',
          variant: 'checkbox'
        },
        mielomaMultiple: {
          kind: 'boolean',
          label: 'Mieloma múltiple',
          variant: 'checkbox'
        },
        otrosTrastornosMedulares: {
          kind: 'boolean',
          label: 'Otros trastornos medulares',
          variant: 'checkbox'
        },
        epoc: {
          kind: 'boolean',
          label: 'Enfermedad pulmonar obstructiva crónica (EPOC)',
          variant: 'checkbox'
        },
        enfermedadRenalCronica: {
          kind: 'boolean',
          label: 'Enfermedad renal crónica (ERC)',
          variant: 'checkbox'
        }
      }
    },
    {
      title: 'EPISODIO DE LA FRACTURA POR FRAGILIDAD',
      description:
        'Complete la siguiente información relacionada con la fractura por fragilidad reciente del paciente.',
      fields: {
        // Primera fractura
        fechaFractura1: {
          kind: 'date',
          label: 'Fecha de la FF'
        },
        localizacionFractura1: {
          kind: 'string',
          label: 'Localización - Elegir una opción',
          variant: 'radio',
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
        hospitalizacion1: {
          kind: 'string',
          label: '¿Requirió hospitalización?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        // Segunda fractura
        fechaFractura2: {
          kind: 'date',
          label: 'Fecha de la FF (segunda fractura)'
        },
        localizacionFractura2: {
          kind: 'string',
          label: 'Localización - Elegir una opción',
          variant: 'radio',
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
        hospitalizacion2: {
          kind: 'string',
          label: '¿Requirió hospitalización? (segunda fractura)',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        // Tercera fractura
        fechaFractura3: {
          kind: 'date',
          label: 'Fecha de la FF (tercera fractura)'
        },
        localizacionFractura3: {
          kind: 'string',
          label: 'Localización - Elegir una opción',
          variant: 'radio',
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
        hospitalizacion3: {
          kind: 'string',
          label: '¿Requirió hospitalización? (tercera fractura)',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        }
      }
    },
    {
      title: 'DIAGNÓSTICO DE OSTEOPOROSIS',
      fields: {
        pacienteDiagnosticado: {
          kind: 'string',
          label: '¿El paciente está diagnosticado de osteoporosis?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        fechaDiagnostico: {
          kind: 'date',
          label: '¿Cuál fue la fecha en la que tuvo lugar el diagnóstico?'
        },
        metodoDiagnostico: {
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
        },
        otroMetodoEspecificar: {
          kind: 'string',
          label: 'Otro (especificar):',
          variant: 'input'
        }
      }
    },
    {
      title: 'PRESCRIPCIÓN DEL TRATAMIENTO DE OSTEOPOROSIS',
      description:
        'Indique los tratamientos que el paciente ha recibido para la osteoporosis y la duración de cada uno de ellos. Si continúa con la medicación no rellene la fecha fin y marque la casilla "continúa". Si no continúa, complete el "motivo de interrupción de la medicación"',
      fields: {
        // Alendronato
        alendronatoFechaInicio: {
          kind: 'date',
          label: 'Alendronato - Fecha inicio'
        },
        alendronatoFechaFin: {
          kind: 'date',
          label: 'Alendronato - Fecha fin'
        },
        alendronatoContinua: {
          kind: 'string',
          label: 'Alendronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        alendronatoMotivoInterrupcion: {
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
        },
        // Risedronato
        risedronatoFechaInicio: {
          kind: 'date',
          label: 'Risedronato - Fecha inicio'
        },
        risedronatoFechaFin: {
          kind: 'date',
          label: 'Risedronato - Fecha fin'
        },
        risedronatoContinua: {
          kind: 'string',
          label: 'Risedronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        risedronatoMotivoInterrupcion: {
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
        },
        // Ibandronato
        ibandronatoFechaInicio: {
          kind: 'date',
          label: 'Ibandronato - Fecha inicio'
        },
        ibandronatoFechaFin: {
          kind: 'date',
          label: 'Ibandronato - Fecha fin'
        },
        ibandronatoContinua: {
          kind: 'string',
          label: 'Ibandronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        ibandronatoMotivoInterrupcion: {
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
        },
        // Zoledronato
        zoledronatoFechaInicio: {
          kind: 'date',
          label: 'Zoledronato - Fecha inicio'
        },
        zoledronatoFechaFin: {
          kind: 'date',
          label: 'Zoledronato - Fecha fin'
        },
        zoledronatoContinua: {
          kind: 'string',
          label: 'Zoledronato - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        zoledronatoMotivoInterrupcion: {
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
        },
        // Denosumab
        denosumabFechaInicio: {
          kind: 'date',
          label: 'Denosumab - Fecha inicio'
        },
        denosumabFechaFin: {
          kind: 'date',
          label: 'Denosumab - Fecha fin'
        },
        denosumabContinua: {
          kind: 'string',
          label: 'Denosumab - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        denosumabMotivoInterrupcion: {
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
        },
        // Raloxifeno
        raloxifenoFechaInicio: {
          kind: 'date',
          label: 'Raloxifeno - Fecha inicio'
        },
        raloxifenoFechaFin: {
          kind: 'date',
          label: 'Raloxifeno - Fecha fin'
        },
        raloxifenoContinua: {
          kind: 'string',
          label: 'Raloxifeno - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        raloxifenoMotivoInterrupcion: {
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
        },
        // Bazedoxifeno
        bazedoxifenoFechaInicio: {
          kind: 'date',
          label: 'Bazedoxifeno - Fecha inicio'
        },
        bazedoxifenoFechaFin: {
          kind: 'date',
          label: 'Bazedoxifeno - Fecha fin'
        },
        bazedoxifenoContinua: {
          kind: 'string',
          label: 'Bazedoxifeno - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        bazedoxifenoMotivoInterrupcion: {
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
        },
        // Tibolona
        tibolonaFechaInicio: {
          kind: 'date',
          label: 'Tibolona - Fecha inicio'
        },
        tibolonaFechaFin: {
          kind: 'date',
          label: 'Tibolona - Fecha fin'
        },
        tibolonaContinua: {
          kind: 'string',
          label: 'Tibolona - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        tibolonaMotivoInterrupcion: {
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
        },
        // Teriparatida
        teriparatidaFechaInicio: {
          kind: 'date',
          label: 'Teriparatida - Fecha inicio'
        },
        teriparatidaFechaFin: {
          kind: 'date',
          label: 'Teriparatida - Fecha fin'
        },
        teriparatidaContinua: {
          kind: 'string',
          label: 'Teriparatida - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        teriparatidaMotivoInterrupcion: {
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
        },
        // Abaloparatida
        abaloparatidaFechaInicio: {
          kind: 'date',
          label: 'Abaloparatida - Fecha inicio'
        },
        abaloparatidaFechaFin: {
          kind: 'date',
          label: 'Abaloparatida - Fecha fin'
        },
        abaloparatidaContinua: {
          kind: 'string',
          label: 'Abaloparatida - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        abaloparatidaMotivoInterrupcion: {
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
        },
        // Romosozumab
        romosozumabFechaInicio: {
          kind: 'date',
          label: 'Romosozumab - Fecha inicio'
        },
        romosozumabFechaFin: {
          kind: 'date',
          label: 'Romosozumab - Fecha fin'
        },
        romosozumabContinua: {
          kind: 'string',
          label: 'Romosozumab - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        romosozumabMotivoInterrupcion: {
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
        }
      }
    },
    {
      title: 'TRATAMIENTO NO FARMACOLÓGICO OSTEOPOROSIS',
      description:
        'Indique los tratamientos no farmacológicos que el paciente ha recibido para la osteoporosis. Además, en aquellos en los que aplique, indique si actualmente continúa con ellos.',
      fields: {
        ejercicioFisico: {
          kind: 'string',
          label: 'Ejercicio físico - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        ejercicioFisicoContinua: {
          kind: 'string',
          label: 'Ejercicio físico - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        suplementosCalcioVitaminaD: {
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        suplementosCalcioVitaminaDContinua: {
          kind: 'string',
          label: 'Suplementos de calcio / vitamina D - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        dejarFumar: {
          kind: 'string',
          label: 'Dejar de fumar - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        dejarFumarContinua: {
          kind: 'string',
          label: 'Dejar de fumar - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        reduccionConsumoAlcohol: {
          kind: 'string',
          label: 'Reducción de consumo de alcohol - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        reduccionConsumoAlcoholContinua: {
          kind: 'string',
          label: 'Reducción de consumo de alcohol - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        protectoresCadera: {
          kind: 'string',
          label: 'Protectores de cadera - ¿Lo ha recibido?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        protectoresCaderaContinua: {
          kind: 'string',
          label: 'Protectores de cadera - Continúa',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        otroTratamiento: {
          kind: 'string',
          label: 'Otros',
          variant: 'input'
        }
      }
    },
    {
      title: 'FORMULARIO FIN DE ESTUDIO',
      fields: {
        fechaFinEstudio: {
          kind: 'date',
          label: '¿Fecha en que se rellena el formulario de fin de estudio?'
        },
        pacienteCompletoEstudio: {
          kind: 'string',
          label: '¿Ha completado el paciente el estudio?',
          variant: 'radio',
          options: {
            si: 'Sí',
            no: 'No'
          }
        },
        motivoNoCompletado: {
          kind: 'string',
          label: 'En caso negativo, indique el motivo',
          variant: 'radio',
          options: {
            decisionInvestigador: 'Decisión del investigador',
            decisionPaciente: 'Decisión del paciente',
            otro: 'Otro'
          }
        },
        otroMotivoEspecificar: {
          kind: 'string',
          label: 'Otro motivo (especificar):',
          variant: 'input'
        },
        inicialesFinEstudio: {
          kind: 'string',
          label: 'Iniciales del profesional sanitario',
          variant: 'input'
        },
        firmaFinEstudio: {
          kind: 'string',
          label: 'Firma del profesional sanitario',
          variant: 'input'
        }
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
          const peso = parseFloat(data.pesoPaciente);
          const altura = parseFloat(data.alturaPaciente);

          if (isNaN(peso) || isNaN(altura) || altura === 0) {
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
      edadPaciente: z.string().optional(),
      pesoPaciente: z.string().optional(),
      alturaPaciente: z.string().optional(),
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
