import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: 'es',
  tags: ['Clinical Research', 'Osteoporosis', 'Multicenter Study'],
  internal: {
    edition: 1,
    name: 'OSTEOPOROSIS_CRF_STUDY'
  },
  content: [
    {
      title: 'DATOS DE IDENTIFICACIÓN DEL PACIENTE',
      fields: {
        codigoPaciente: {
          kind: 'string',
          label: 'Código del paciente',
          description: 'Código único asignado al paciente en el estudio',
          variant: 'input'
        },
        inicialesPaciente: {
          kind: 'string',
          label: 'Iniciales del paciente',
          description: 'Primera letra del nombre + Primera letra primer apellido + Primera letra segundo apellido',
          variant: 'input'
        },
        centro: {
          kind: 'string',
          label: 'Centro',
          description: 'Nombre del centro hospitalario',
          variant: 'input'
        },
        codigoCentro: {
          kind: 'string',
          label: 'Código del centro',
          variant: 'input'
        },
        investigadorPrincipal: {
          kind: 'string',
          label: 'Investigador principal',
          description: 'Nombre completo del investigador responsable',
          variant: 'input'
        },
        fechaInclusion: {
          kind: 'date',
          label: 'Fecha de inclusión en el estudio'
        }
      }
    },
    {
      title: 'DATOS DEMOGRÁFICOS Y ANTROPOMÉTRICOS',
      fields: {
        fechaNacimiento: {
          kind: 'date',
          label: 'Fecha de nacimiento'
        },
        edad: {
          kind: 'number',
          label: 'Edad (años)',
          variant: 'input',
          min: 0,
          max: 120
        },
        sexo: {
          kind: 'string',
          label: 'Sexo',
          variant: 'radio',
          options: {
            mujer: 'Mujer',
            hombre: 'Hombre'
          }
        },
        peso: {
          kind: 'number',
          label: 'Peso (kg)',
          variant: 'input',
          min: 0
        },
        talla: {
          kind: 'number',
          label: 'Talla (cm)',
          variant: 'input',
          min: 0
        },
        imc: {
          kind: 'number',
          label: 'IMC (kg/m²)',
          description: 'Índice de Masa Corporal',
          variant: 'input',
          min: 0
        },
        raza: {
          kind: 'string',
          label: 'Raza/Etnia',
          variant: 'select',
          options: {
            caucasica: 'Caucásica',
            asiatica: 'Asiática',
            afroamericana: 'Afroamericana',
            hispana: 'Hispana',
            otra: 'Otra'
          }
        }
      }
    },
    {
      title: 'ANTECEDENTES PERSONALES',
      fields: {
        menarquia: {
          kind: 'number',
          label: 'Edad de menarquia (años)',
          variant: 'input',
          min: 0,
          max: 25
        },
        menopausia: {
          kind: 'boolean',
          label: '¿Ha alcanzado la menopausia?',
          variant: 'radio'
        },
        edadMenopausia: {
          kind: 'number',
          label: 'Edad de menopausia (años)',
          variant: 'input',
          min: 0
        },
        tipoMenopausia: {
          kind: 'string',
          label: 'Tipo de menopausia',
          variant: 'radio',
          options: {
            natural: 'Natural',
            quirurgica: 'Quirúrgica',
            inducida: 'Inducida (quimioterapia/radioterapia)'
          }
        },
        gestaciones: {
          kind: 'number',
          label: 'Número de gestaciones',
          variant: 'input',
          min: 0
        },
        partos: {
          kind: 'number',
          label: 'Número de partos',
          variant: 'input',
          min: 0
        },
        lactanciaMaterna: {
          kind: 'boolean',
          label: '¿Ha dado lactancia materna?',
          variant: 'radio'
        },
        duracionLactancia: {
          kind: 'number',
          label: 'Duración total de lactancia materna (meses)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'ANTECEDENTES MÉDICOS',
      fields: {
        fracturaPrevia: {
          kind: 'boolean',
          label: 'Fractura previa por fragilidad',
          variant: 'radio'
        },
        localizacionFractura: {
          kind: 'set',
          label: 'Localización de fracturas previas',
          variant: 'listbox',
          options: {
            vertebral: 'Vertebral',
            cadera: 'Cadera',
            muneca: 'Muñeca',
            humero: 'Húmero',
            costillas: 'Costillas',
            pelvis: 'Pelvis',
            otra: 'Otra'
          }
        },
        fechaUltimaFractura: {
          kind: 'date',
          label: 'Fecha de la última fractura'
        },
        diabetesMellitus: {
          kind: 'boolean',
          label: 'Diabetes Mellitus',
          variant: 'radio'
        },
        tipoDiabetes: {
          kind: 'string',
          label: 'Tipo de diabetes',
          variant: 'radio',
          options: {
            tipo1: 'Tipo 1',
            tipo2: 'Tipo 2',
            gestacional: 'Gestacional'
          }
        },
        hipertiroidismo: {
          kind: 'boolean',
          label: 'Hipertiroidismo',
          variant: 'radio'
        },
        hipotiroidismo: {
          kind: 'boolean',
          label: 'Hipotiroidismo',
          variant: 'radio'
        },
        hiperparatiroidismo: {
          kind: 'boolean',
          label: 'Hiperparatiroidismo',
          variant: 'radio'
        },
        enfermedadCeliaca: {
          kind: 'boolean',
          label: 'Enfermedad celíaca',
          variant: 'radio'
        },
        enfermedadInflamatoria: {
          kind: 'boolean',
          label: 'Enfermedad inflamatoria intestinal',
          variant: 'radio'
        },
        enfermedadReumatica: {
          kind: 'boolean',
          label: 'Enfermedad reumática',
          variant: 'radio'
        },
        tipoEnfermedadReumatica: {
          kind: 'string',
          label: 'Tipo de enfermedad reumática',
          variant: 'input'
        },
        insuficienciaRenal: {
          kind: 'boolean',
          label: 'Insuficiencia renal crónica',
          variant: 'radio'
        },
        enfermedadHepatica: {
          kind: 'boolean',
          label: 'Enfermedad hepática',
          variant: 'radio'
        },
        epoc: {
          kind: 'boolean',
          label: 'EPOC (Enfermedad Pulmonar Obstructiva Crónica)',
          variant: 'radio'
        },
        cancer: {
          kind: 'boolean',
          label: 'Historia de cáncer',
          variant: 'radio'
        },
        tipoCancer: {
          kind: 'string',
          label: 'Tipo de cáncer',
          variant: 'input'
        }
      }
    },
    {
      title: 'ANTECEDENTES FAMILIARES',
      fields: {
        fracturaFamiliar: {
          kind: 'boolean',
          label: 'Historia familiar de fractura de cadera',
          variant: 'radio'
        },
        parentescoFractura: {
          kind: 'string',
          label: 'Parentesco',
          variant: 'select',
          options: {
            madre: 'Madre',
            padre: 'Padre',
            hermanos: 'Hermanos',
            abuelos: 'Abuelos',
            otro: 'Otro'
          }
        },
        osteoporosisFamiliar: {
          kind: 'boolean',
          label: 'Historia familiar de osteoporosis',
          variant: 'radio'
        },
        parentescoOsteoporosis: {
          kind: 'string',
          label: 'Parentesco',
          variant: 'select',
          options: {
            madre: 'Madre',
            padre: 'Padre',
            hermanos: 'Hermanos',
            abuelos: 'Abuelos',
            otro: 'Otro'
          }
        }
      }
    },
    {
      title: 'HÁBITOS DE VIDA',
      fields: {
        tabaquismo: {
          kind: 'string',
          label: 'Hábito tabáquico',
          variant: 'radio',
          options: {
            nunca: 'Nunca fumador',
            exfumador: 'Ex-fumador',
            fumadorActual: 'Fumador actual'
          }
        },
        cigarrillosDia: {
          kind: 'number',
          label: 'Número de cigarrillos/día',
          variant: 'input',
          min: 0
        },
        aniosTabaquismo: {
          kind: 'number',
          label: 'Años de tabaquismo',
          variant: 'input',
          min: 0
        },
        paquetesAnio: {
          kind: 'number',
          label: 'Paquetes-año',
          description: 'Número de cigarrillos/día ÷ 20 × años fumando',
          variant: 'input',
          min: 0
        },
        consumoAlcohol: {
          kind: 'string',
          label: 'Consumo de alcohol',
          variant: 'radio',
          options: {
            no: 'No',
            ocasional: 'Ocasional (< 1 unidad/día)',
            moderado: 'Moderado (1-2 unidades/día)',
            excesivo: 'Excesivo (> 2 unidades/día)'
          }
        },
        unidadesAlcoholSemana: {
          kind: 'number',
          label: 'Unidades de alcohol/semana',
          description: '1 unidad = 10g alcohol puro',
          variant: 'input',
          min: 0
        },
        actividadFisica: {
          kind: 'string',
          label: 'Nivel de actividad física',
          variant: 'radio',
          options: {
            sedentario: 'Sedentario',
            ligero: 'Ligero (< 30 min/día)',
            moderado: 'Moderado (30-60 min/día)',
            intenso: 'Intenso (> 60 min/día)'
          }
        },
        tipoEjercicio: {
          kind: 'set',
          label: 'Tipo de ejercicio',
          variant: 'listbox',
          options: {
            caminar: 'Caminar',
            correr: 'Correr',
            natacion: 'Natación',
            ciclismo: 'Ciclismo',
            gimnasio: 'Gimnasio/Musculación',
            deporteEquipo: 'Deporte de equipo',
            yoga: 'Yoga/Pilates',
            otro: 'Otro'
          }
        },
        exposicionSolar: {
          kind: 'string',
          label: 'Exposición solar',
          variant: 'radio',
          options: {
            minima: 'Mínima (< 15 min/día)',
            moderada: 'Moderada (15-30 min/día)',
            alta: 'Alta (> 30 min/día)'
          }
        }
      }
    },
    {
      title: 'TRATAMIENTO FARMACOLÓGICO',
      fields: {
        corticoides: {
          kind: 'boolean',
          label: 'Tratamiento con corticoides (> 3 meses)',
          variant: 'radio'
        },
        dosisCortcoide: {
          kind: 'number',
          label: 'Dosis diaria de corticoide (mg prednisona equivalente)',
          variant: 'input',
          min: 0
        },
        duracionCorticoide: {
          kind: 'number',
          label: 'Duración del tratamiento con corticoides (meses)',
          variant: 'input',
          min: 0
        },
        tratamientoTiroideo: {
          kind: 'boolean',
          label: 'Tratamiento tiroideo supresor',
          variant: 'radio'
        },
        anticonvulsivantes: {
          kind: 'boolean',
          label: 'Anticonvulsivantes',
          variant: 'radio'
        },
        inhibidoresBomba: {
          kind: 'boolean',
          label: 'Inhibidores de la bomba de protones',
          variant: 'radio'
        },
        heparina: {
          kind: 'boolean',
          label: 'Heparina (uso prolongado)',
          variant: 'radio'
        },
        inmunosupresores: {
          kind: 'boolean',
          label: 'Inmunosupresores',
          variant: 'radio'
        },
        quimioterapia: {
          kind: 'boolean',
          label: 'Quimioterapia',
          variant: 'radio'
        },
        antiretrovirales: {
          kind: 'boolean',
          label: 'Tratamiento antirretroviral',
          variant: 'radio'
        },
        terapiaHormonal: {
          kind: 'boolean',
          label: 'Terapia hormonal sustitutiva',
          variant: 'radio'
        },
        duracionTerapiaHormonal: {
          kind: 'number',
          label: 'Duración de terapia hormonal (años)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'TRATAMIENTO PARA OSTEOPOROSIS',
      fields: {
        tratamientoOsteoporosis: {
          kind: 'boolean',
          label: '¿Ha recibido tratamiento para osteoporosis?',
          variant: 'radio'
        },
        tipoTratamientoOsteoporosis: {
          kind: 'set',
          label: 'Tipo de tratamiento para osteoporosis',
          variant: 'listbox',
          options: {
            bisfosfonatos: 'Bisfosfonatos',
            denosumab: 'Denosumab',
            teriparatida: 'Teriparatida',
            raloxifeno: 'Raloxifeno',
            ranelato: 'Ranelato de estroncio',
            calcitonina: 'Calcitonina',
            otro: 'Otro'
          }
        },
        nombreTratamiento: {
          kind: 'string',
          label: 'Nombre del tratamiento',
          variant: 'input'
        },
        fechaInicioTratamiento: {
          kind: 'date',
          label: 'Fecha de inicio del tratamiento'
        },
        fechaFinTratamiento: {
          kind: 'date',
          label: 'Fecha de fin del tratamiento (si aplica)'
        },
        adherenciaTratamiento: {
          kind: 'string',
          label: 'Adherencia al tratamiento',
          variant: 'radio',
          options: {
            buena: 'Buena (> 80%)',
            regular: 'Regular (50-80%)',
            mala: 'Mala (< 50%)'
          }
        }
      }
    },
    {
      title: 'SUPLEMENTACIÓN',
      fields: {
        suplementoCalcio: {
          kind: 'boolean',
          label: 'Suplemento de calcio',
          variant: 'radio'
        },
        dosisCalcio: {
          kind: 'number',
          label: 'Dosis de calcio (mg/día)',
          variant: 'input',
          min: 0
        },
        suplementoVitaminaD: {
          kind: 'boolean',
          label: 'Suplemento de vitamina D',
          variant: 'radio'
        },
        dosisVitaminaD: {
          kind: 'number',
          label: 'Dosis de vitamina D (UI/día)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'INGESTA DIETÉTICA',
      fields: {
        ingestaLacteos: {
          kind: 'string',
          label: 'Ingesta de productos lácteos',
          variant: 'radio',
          options: {
            baja: 'Baja (< 1 ración/día)',
            moderada: 'Moderada (1-2 raciones/día)',
            alta: 'Alta (> 2 raciones/día)'
          }
        },
        ingestaCafe: {
          kind: 'string',
          label: 'Consumo de café',
          variant: 'radio',
          options: {
            no: 'No consume',
            bajo: 'Bajo (1-2 tazas/día)',
            moderado: 'Moderado (3-4 tazas/día)',
            alto: 'Alto (> 4 tazas/día)'
          }
        },
        dietaVegetariana: {
          kind: 'boolean',
          label: 'Dieta vegetariana/vegana',
          variant: 'radio'
        }
      }
    },
    {
      title: 'EXPLORACIÓN FÍSICA',
      fields: {
        cifosisToracica: {
          kind: 'boolean',
          label: 'Cifosis torácica',
          variant: 'radio'
        },
        perdidaAltura: {
          kind: 'number',
          label: 'Pérdida de altura desde la juventud (cm)',
          variant: 'input',
          min: 0
        },
        testDistanciaParedOcciput: {
          kind: 'number',
          label: 'Test distancia pared-occipucio (cm)',
          variant: 'input',
          min: 0
        },
        testDistanciaCostillasPelvis: {
          kind: 'number',
          label: 'Test distancia costillas-pelvis (cm)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'DATOS ANALÍTICOS',
      fields: {
        fechaAnalitica: {
          kind: 'date',
          label: 'Fecha de la analítica'
        },
        calcioSerico: {
          kind: 'number',
          label: 'Calcio sérico (mg/dL)',
          variant: 'input',
          min: 0
        },
        fosforoSerico: {
          kind: 'number',
          label: 'Fósforo sérico (mg/dL)',
          variant: 'input',
          min: 0
        },
        fosfatasaAlcalina: {
          kind: 'number',
          label: 'Fosfatasa alcalina (UI/L)',
          variant: 'input',
          min: 0
        },
        pth: {
          kind: 'number',
          label: 'PTH (hormona paratiroidea) (pg/mL)',
          variant: 'input',
          min: 0
        },
        vitaminaD25OH: {
          kind: 'number',
          label: '25-OH vitamina D (ng/mL)',
          variant: 'input',
          min: 0
        },
        creatinina: {
          kind: 'number',
          label: 'Creatinina (mg/dL)',
          variant: 'input',
          min: 0
        },
        filtradoGlomerular: {
          kind: 'number',
          label: 'Filtrado glomerular estimado (mL/min/1.73m²)',
          variant: 'input',
          min: 0
        },
        tsh: {
          kind: 'number',
          label: 'TSH (μUI/mL)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'MARCADORES DE REMODELADO ÓSEO',
      fields: {
        ctx: {
          kind: 'number',
          label: 'CTX (marcador de resorción) (ng/mL)',
          variant: 'input',
          min: 0
        },
        p1np: {
          kind: 'number',
          label: 'P1NP (marcador de formación) (ng/mL)',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'DENSITOMETRÍA ÓSEA (DXA)',
      fields: {
        fechaDxa: {
          kind: 'date',
          label: 'Fecha de la densitometría'
        },
        dmoColumnaLumbar: {
          kind: 'number',
          label: 'DMO columna lumbar L1-L4 (g/cm²)',
          description: 'Densidad Mineral Ósea',
          variant: 'input',
          min: 0
        },
        tScoreColumnaLumbar: {
          kind: 'number',
          label: 'T-Score columna lumbar',
          variant: 'input'
        },
        zScoreColumnaLumbar: {
          kind: 'number',
          label: 'Z-Score columna lumbar',
          variant: 'input'
        },
        dmoCuelloFemoral: {
          kind: 'number',
          label: 'DMO cuello femoral (g/cm²)',
          variant: 'input',
          min: 0
        },
        tScoreCuelloFemoral: {
          kind: 'number',
          label: 'T-Score cuello femoral',
          variant: 'input'
        },
        zScoreCuelloFemoral: {
          kind: 'number',
          label: 'Z-Score cuello femoral',
          variant: 'input'
        },
        dmoCaderaTotal: {
          kind: 'number',
          label: 'DMO cadera total (g/cm²)',
          variant: 'input',
          min: 0
        },
        tScoreCaderaTotal: {
          kind: 'number',
          label: 'T-Score cadera total',
          variant: 'input'
        },
        zScoreCaderaTotal: {
          kind: 'number',
          label: 'Z-Score cadera total',
          variant: 'input'
        },
        dmoRadio: {
          kind: 'number',
          label: 'DMO radio distal (g/cm²)',
          variant: 'input',
          min: 0
        },
        tScoreRadio: {
          kind: 'number',
          label: 'T-Score radio',
          variant: 'input'
        }
      }
    },
    {
      title: 'DIAGNÓSTICO DENSITOMÉTRICO (OMS)',
      fields: {
        diagnosticoDxa: {
          kind: 'string',
          label: 'Diagnóstico según criterios OMS',
          variant: 'radio',
          options: {
            normal: 'Normal (T-score ≥ -1.0)',
            osteopenia: 'Osteopenia (T-score entre -1.0 y -2.5)',
            osteoporosis: 'Osteoporosis (T-score ≤ -2.5)',
            osteoporosisGrave: 'Osteoporosis grave (T-score ≤ -2.5 + fractura)'
          }
        }
      }
    },
    {
      title: 'EVALUACIÓN RADIOLÓGICA VERTEBRAL',
      fields: {
        radiografiaColumna: {
          kind: 'boolean',
          label: '¿Se realizó radiografía de columna?',
          variant: 'radio'
        },
        fechaRadiografia: {
          kind: 'date',
          label: 'Fecha de la radiografía'
        },
        fracturaVertebralRadiologica: {
          kind: 'boolean',
          label: 'Fractura vertebral radiológica detectada',
          variant: 'radio'
        },
        numeroFracturasVertebrales: {
          kind: 'number',
          label: 'Número de fracturas vertebrales',
          variant: 'input',
          min: 0
        },
        localizacionFracturasVertebrales: {
          kind: 'string',
          label: 'Localización de fracturas vertebrales',
          description: 'Especificar vértebras afectadas (ej: T12, L1)',
          variant: 'textarea'
        },
        gradoGenant: {
          kind: 'string',
          label: 'Grado de deformidad vertebral (clasificación de Genant)',
          variant: 'radio',
          options: {
            grado1: 'Grado 1: reducción 20-25%',
            grado2: 'Grado 2: reducción 25-40%',
            grado3: 'Grado 3: reducción > 40%'
          }
        }
      }
    },
    {
      title: 'CÁLCULO DEL RIESGO DE FRACTURA (FRAX)',
      fields: {
        fraxSinDmo: {
          kind: 'number',
          label: 'FRAX fractura mayor sin DMO (%)',
          description: 'Riesgo a 10 años de fractura mayor osteoporótica',
          variant: 'input',
          min: 0,
          max: 100
        },
        fraxCaderaSinDmo: {
          kind: 'number',
          label: 'FRAX fractura de cadera sin DMO (%)',
          description: 'Riesgo a 10 años de fractura de cadera',
          variant: 'input',
          min: 0,
          max: 100
        },
        fraxConDmo: {
          kind: 'number',
          label: 'FRAX fractura mayor con DMO (%)',
          variant: 'input',
          min: 0,
          max: 100
        },
        fraxCaderaConDmo: {
          kind: 'number',
          label: 'FRAX fractura de cadera con DMO (%)',
          variant: 'input',
          min: 0,
          max: 100
        }
      }
    },
    {
      title: 'EVALUACIÓN DEL RIESGO DE CAÍDAS',
      fields: {
        caidasUltimoAnio: {
          kind: 'number',
          label: 'Número de caídas en el último año',
          variant: 'input',
          min: 0
        },
        miedoCaida: {
          kind: 'boolean',
          label: 'Miedo a caerse',
          variant: 'radio'
        },
        usoDispositivos: {
          kind: 'set',
          label: 'Uso de dispositivos de ayuda',
          variant: 'listbox',
          options: {
            baston: 'Bastón',
            muletas: 'Muletas',
            andador: 'Andador',
            sillaRuedas: 'Silla de ruedas',
            ninguno: 'Ninguno'
          }
        },
        alteracionEquilibrio: {
          kind: 'boolean',
          label: 'Alteración del equilibrio',
          variant: 'radio'
        },
        alteracionMarcha: {
          kind: 'boolean',
          label: 'Alteración de la marcha',
          variant: 'radio'
        },
        deterioroCognitivo: {
          kind: 'boolean',
          label: 'Deterioro cognitivo',
          variant: 'radio'
        },
        deficitVisual: {
          kind: 'boolean',
          label: 'Déficit visual',
          variant: 'radio'
        },
        medicacionPsicoactiva: {
          kind: 'boolean',
          label: 'Medicación psicoactiva (sedantes, hipnóticos)',
          variant: 'radio'
        },
        testTimedUpAndGo: {
          kind: 'number',
          label: 'Test Timed Up and Go (segundos)',
          description: 'Normal: < 10 seg; Riesgo moderado: 10-20 seg; Riesgo alto: > 20 seg',
          variant: 'input',
          min: 0
        }
      }
    },
    {
      title: 'CALIDAD DE VIDA Y ESTADO FUNCIONAL',
      fields: {
        escalaDolor: {
          kind: 'number',
          label: 'Escala visual analógica del dolor (0-10)',
          description: '0 = sin dolor, 10 = dolor máximo',
          variant: 'slider',
          min: 0,
          max: 10
        },
        limitacionActividades: {
          kind: 'string',
          label: 'Limitación de actividades diarias',
          variant: 'radio',
          options: {
            ninguna: 'Ninguna',
            leve: 'Leve',
            moderada: 'Moderada',
            grave: 'Grave'
          }
        },
        independenciaActividades: {
          kind: 'string',
          label: 'Independencia para actividades básicas de la vida diaria',
          variant: 'radio',
          options: {
            independiente: 'Independiente',
            ayudaParcial: 'Requiere ayuda parcial',
            ayudaTotal: 'Requiere ayuda total'
          }
        }
      }
    },
    {
      title: 'OBSERVACIONES Y COMENTARIOS',
      fields: {
        observaciones: {
          kind: 'string',
          label: 'Observaciones generales',
          description: 'Incluya cualquier información relevante adicional',
          variant: 'textarea'
        },
        investigadorResponsable: {
          kind: 'string',
          label: 'Nombre del investigador que completa el CRF',
          variant: 'input'
        },
        fechaCompletado: {
          kind: 'date',
          label: 'Fecha de completado del CRF'
        }
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 45,
    instructions: [
      'Complete todos los campos del formulario con la información más precisa posible',
      'Los campos marcados con * son obligatorios',
      'Utilice las unidades de medida especificadas en cada campo',
      'En caso de duda, consulte con el investigador principal',
      'Asegúrese de verificar los datos antes de enviar el formulario'
    ]
  },
  details: {
    description: 'Cuaderno de Recogida de Datos para el Estudio Observacional Multicéntrico sobre Factores de Riesgo de Osteoporosis. Versión final 10/09/25',
    title: 'CRF Estudio Osteoporosis Multicéntrico',
    license: 'Apache-2.0',
    authors: ['Equipo de Investigación Osteoporosis']
  },
  measures: {
    imc: {
      kind: 'computed',
      label: 'Índice de Masa Corporal',
      value: (data) => {
        if (data.peso && data.talla) {
          const tallaMetros = data.talla / 100;
          return Math.round((data.peso / (tallaMetros * tallaMetros)) * 100) / 100;
        }
        return undefined;
      }
    },
    riesgoFracturaAlto: {
      kind: 'computed',
      label: 'Riesgo Alto de Fractura (FRAX > 20%)',
      value: (data) => {
        if (data.fraxConDmo) {
          return data.fraxConDmo > 20;
        }
        return undefined;
      }
    },
    diagnosticoOsteoporosis: {
      kind: 'const',
      ref: 'diagnosticoDxa',
      label: 'Diagnóstico Densitométrico'
    },
    deficienciaVitaminaD: {
      kind: 'computed',
      label: 'Deficiencia de Vitamina D',
      value: (data) => {
        if (data.vitaminaD25OH) {
          return data.vitaminaD25OH < 20;
        }
        return undefined;
      }
    }
  },
  validationSchema: z.object({
    // DATOS DE IDENTIFICACIÓN
    codigoPaciente: z.string().min(1),
    inicialesPaciente: z.string().min(3).max(3),
    centro: z.string().min(1),
    codigoCentro: z.string().min(1),
    investigadorPrincipal: z.string().min(1),
    fechaInclusion: z.date(),
    
    // DATOS DEMOGRÁFICOS
    fechaNacimiento: z.date(),
    edad: z.number().int().min(18).max(120),
    sexo: z.enum(['mujer', 'hombre']),
    peso: z.number().positive(),
    talla: z.number().positive(),
    imc: z.number().positive().optional(),
    raza: z.enum(['caucasica', 'asiatica', 'afroamericana', 'hispana', 'otra']),
    
    // ANTECEDENTES PERSONALES
    menarquia: z.number().int().min(8).max(20).optional(),
    menopausia: z.boolean(),
    edadMenopausia: z.number().int().min(30).max(60).optional(),
    tipoMenopausia: z.enum(['natural', 'quirurgica', 'inducida']).optional(),
    gestaciones: z.number().int().min(0).optional(),
    partos: z.number().int().min(0).optional(),
    lactanciaMaterna: z.boolean().optional(),
    duracionLactancia: z.number().int().min(0).optional(),
    
    // ANTECEDENTES MÉDICOS
    fracturaPrevia: z.boolean(),
    localizacionFractura: z.set(z.enum(['vertebral', 'cadera', 'muneca', 'humero', 'costillas', 'pelvis', 'otra'])).optional(),
    fechaUltimaFractura: z.date().optional(),
    diabetesMellitus: z.boolean(),
    tipoDiabetes: z.enum(['tipo1', 'tipo2', 'gestacional']).optional(),
    hipertiroidismo: z.boolean(),
    hipotiroidismo: z.boolean(),
    hiperparatiroidismo: z.boolean(),
    enfermedadCeliaca: z.boolean(),
    enfermedadInflamatoria: z.boolean(),
    enfermedadReumatica: z.boolean(),
    tipoEnfermedadReumatica: z.string().optional(),
    insuficienciaRenal: z.boolean(),
    enfermedadHepatica: z.boolean(),
    epoc: z.boolean(),
    cancer: z.boolean(),
    tipoCancer: z.string().optional(),
    
    // ANTECEDENTES FAMILIARES
    fracturaFamiliar: z.boolean(),
    parentescoFractura: z.enum(['madre', 'padre', 'hermanos', 'abuelos', 'otro']).optional(),
    osteoporosisFamiliar: z.boolean(),
    parentescoOsteoporosis: z.enum(['madre', 'padre', 'hermanos', 'abuelos', 'otro']).optional(),
    
    // HÁBITOS DE VIDA
    tabaquismo: z.enum(['nunca', 'exfumador', 'fumadorActual']),
    cigarrillosDia: z.number().int().min(0).optional(),
    aniosTabaquismo: z.number().int().min(0).optional(),
    paquetesAnio: z.number().min(0).optional(),
    consumoAlcohol: z.enum(['no', 'ocasional', 'moderado', 'excesivo']),
    unidadesAlcoholSemana: z.number().min(0).optional(),
    actividadFisica: z.enum(['sedentario', 'ligero', 'moderado', 'intenso']),
    tipoEjercicio: z.set(z.enum(['caminar', 'correr', 'natacion', 'ciclismo', 'gimnasio', 'deporteEquipo', 'yoga', 'otro'])).optional(),
    exposicionSolar: z.enum(['minima', 'moderada', 'alta']),
    
    // TRATAMIENTO FARMACOLÓGICO
    corticoides: z.boolean(),
    dosisCortcoide: z.number().min(0).optional(),
    duracionCorticoide: z.number().int().min(0).optional(),
    tratamientoTiroideo: z.boolean(),
    anticonvulsivantes: z.boolean(),
    inhibidoresBomba: z.boolean(),
    heparina: z.boolean(),
    inmunosupresores: z.boolean(),
    quimioterapia: z.boolean(),
    antiretrovirales: z.boolean(),
    terapiaHormonal: z.boolean(),
    duracionTerapiaHormonal: z.number().min(0).optional(),
    
    // TRATAMIENTO OSTEOPOROSIS
    tratamientoOsteoporosis: z.boolean(),
    tipoTratamientoOsteoporosis: z.set(z.enum(['bisfosfonatos', 'denosumab', 'teriparatida', 'raloxifeno', 'ranelato', 'calcitonina', 'otro'])).optional(),
    nombreTratamiento: z.string().optional(),
    fechaInicioTratamiento: z.date().optional(),
    fechaFinTratamiento: z.date().optional(),
    adherenciaTratamiento: z.enum(['buena', 'regular', 'mala']).optional(),
    
    // SUPLEMENTACIÓN
    suplementoCalcio: z.boolean(),
    dosisCalcio: z.number().min(0).optional(),
    suplementoVitaminaD: z.boolean(),
    dosisVitaminaD: z.number().min(0).optional(),
    
    // INGESTA DIETÉTICA
    ingestaLacteos: z.enum(['baja', 'moderada', 'alta']),
    ingestaCafe: z.enum(['no', 'bajo', 'moderado', 'alto']),
    dietaVegetariana: z.boolean(),
    
    // EXPLORACIÓN FÍSICA
    cifosisToracica: z.boolean(),
    perdidaAltura: z.number().min(0).optional(),
    testDistanciaParedOcciput: z.number().min(0).optional(),
    testDistanciaCostillasPelvis: z.number().min(0).optional(),
    
    // DATOS ANALÍTICOS
    fechaAnalitica: z.date().optional(),
    calcioSerico: z.number().min(0).optional(),
    fosforoSerico: z.number().min(0).optional(),
    fosfatasaAlcalina: z.number().min(0).optional(),
    pth: z.number().min(0).optional(),
    vitaminaD25OH: z.number().min(0).optional(),
    creatinina: z.number().min(0).optional(),
    filtradoGlomerular: z.number().min(0).optional(),
    tsh: z.number().min(0).optional(),
    
    // MARCADORES
    ctx: z.number().min(0).optional(),
    p1np: z.number().min(0).optional(),
    
    // DENSITOMETRÍA
    fechaDxa: z.date().optional(),
    dmoColumnaLumbar: z.number().min(0).optional(),
    tScoreColumnaLumbar: z.number().optional(),
    zScoreColumnaLumbar: z.number().optional(),
    dmoCuelloFemoral: z.number().min(0).optional(),
    tScoreCuelloFemoral: z.number().optional(),
    zScoreCuelloFemoral: z.number().optional(),
    dmoCaderaTotal: z.number().min(0).optional(),
    tScoreCaderaTotal: z.number().optional(),
    zScoreCaderaTotal: z.number().optional(),
    dmoRadio: z.number().min(0).optional(),
    tScoreRadio: z.number().optional(),
    diagnosticoDxa: z.enum(['normal', 'osteopenia', 'osteoporosis', 'osteoporosisGrave']).optional(),
    
    // RADIOLOGÍA
    radiografiaColumna: z.boolean(),
    fechaRadiografia: z.date().optional(),
    fracturaVertebralRadiologica: z.boolean().optional(),
    numeroFracturasVertebrales: z.number().int().min(0).optional(),
    localizacionFracturasVertebrales: z.string().optional(),
    gradoGenant: z.enum(['grado1', 'grado2', 'grado3']).optional(),
    
    // FRAX
    fraxSinDmo: z.number().min(0).max(100).optional(),
    fraxCaderaSinDmo: z.number().min(0).max(100).optional(),
    fraxConDmo: z.number().min(0).max(100).optional(),
    fraxCaderaConDmo: z.number().min(0).max(100).optional(),
    
    // RIESGO CAÍDAS
    caidasUltimoAnio: z.number().int().min(0).optional(),
    miedoCaida: z.boolean().optional(),
    usoDispositivos: z.set(z.enum(['baston', 'muletas', 'andador', 'sillaRuedas', 'ninguno'])).optional(),
    alteracionEquilibrio: z.boolean().optional(),
    alteracionMarcha: z.boolean().optional(),
    deterioroCognitivo: z.boolean().optional(),
    deficitVisual: z.boolean().optional(),
    medicacionPsicoactiva: z.boolean().optional(),
    testTimedUpAndGo: z.number().min(0).optional(),
    
    // CALIDAD DE VIDA
    escalaDolor: z.number().int().min(0).max(10).optional(),
    limitacionActividades: z.enum(['ninguna', 'leve', 'moderada', 'grave']).optional(),
    independenciaActividades: z.enum(['independiente', 'ayudaParcial', 'ayudaTotal']).optional(),
    
    // OBSERVACIONES
    observaciones: z.string().optional(),
    investigadorResponsable: z.string().min(1),
    fechaCompletado: z.date()
  })
});