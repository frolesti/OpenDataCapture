/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import type { FormInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

import {
  formatTheraDate,
  isTheraEligible,
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_NAMES,
  THERA_VAGINAL_ITEMS,
  THERA_VULVAR_ITEMS,
  theraDateToISO,
  theraSum,
  theraVisitDateError,
  theraVisitWindow
} from '@opendatacapture/schemas/thera';
import type { TheraVisit } from '@opendatacapture/schemas/thera';

type Values = { [key: string]: unknown };
type Field = FormInstrument.StaticField<'en'>;
type Fields = FormInstrument.Fields<FormInstrument.Data, 'en'>;
type Group = FormInstrument.FieldsGroup<FormInstrument.Data, 'en'>;

const yesNo = { si: 'Sí', no: 'No' };
const requiredText = z.string().trim().min(1, 'Este campo es obligatorio');
const dateSchema = z
  .union([z.string(), z.date(), z.undefined()], {
    errorMap: (_issue, context) => ({
      message: context.data === undefined ? 'Este campo es obligatorio' : 'Introduzca una fecha válida (DD/MM/AAAA)'
    })
  })
  .transform((value, context) => {
    const canonical = theraDateToISO(value);
    if (!canonical) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          value === undefined || value === '' ? 'Este campo es obligatorio' : 'Introduzca una fecha válida (DD/MM/AAAA)'
      });
      return undefined;
    }
    return canonical;
  });
const optionalDate = dateSchema.optional();
const clinicalVisibilityDeps = ['informed_consent', 'consent_date', ...THERA_INCLUSIONS];

const requiredLabel = (label: string) => (label.endsWith(' *') ? label : `${label} *`);
const radio = (label: string, options: { [key: string]: string } = yesNo): FormInstrument.StringField<'en'> => ({
  kind: 'string',
  variant: 'radio',
  label: requiredLabel(label),
  options
});
const text = (label: string, required = true): FormInstrument.StringField<'en'> => ({
  kind: 'string',
  variant: 'input',
  label: required ? requiredLabel(label) : label
});
const dateField = (
  label: string,
  disabled = false
): FormInstrument.DateField<'en'> & { displayFormat: 'dd/MM/yyyy' } => ({
  kind: 'date',
  displayFormat: 'dd/MM/yyyy',
  label: disabled ? label : requiredLabel(label),
  disabled
});
const numeric = (label: string, min: number, max?: number): Field => ({
  kind: 'number',
  variant: 'input',
  label: requiredLabel(label),
  min,
  ...(max === undefined ? {} : { max })
});
const score = (label: string, options: { [key: number]: string }): Field => ({
  kind: 'number',
  variant: 'radio',
  label: requiredLabel(label),
  options
});
const optionsFrom = (labels: string[], start = 1): { [key: number]: string } =>
  Object.fromEntries(labels.map((label, index) => [index + start, label]));

function conditional(field: Field, deps: string[], predicate: (data: Values) => boolean) {
  return {
    kind: 'dynamic' as const,
    deps,
    render: (data: FormInstrument.PartialData) => (predicate(data) ? field : null)
  };
}

const vaginalLabels: [string, string[]][] = [
  ['Elasticidad vaginal', ['Ausente', 'Escasa', 'Aceptable', 'Buena', 'Excelente']],
  ['Volumen de flujo', ['Ausente', 'Escaso', 'Capa fina en la superficie', 'Capa moderada', 'Normal']],
  ['pH vaginal', ['> 6.1', '5.6 a 6', '5.5', '4.7 a 6', '< 4.6']],
  [
    'Integridad del epitelio',
    ['Petequias espontáneas', 'Sangra al menor contacto', 'Sangra al rascado', 'Epitelio no friable', 'Normal']
  ],
  ['Humedad', ['Ausente, superficie inflamada', 'Ausente, superficie normal', 'Mínima', 'Moderada', 'Normal']]
];
const vulvarLabels: [string, string[]][] = [
  ['Labios mayores y menores', ['Normal', 'Pérdida leve', 'Pérdida moderada', 'Pérdida leve o desaparición']],
  [
    'Clítoris',
    [
      'Tamaño normal',
      'Disminución leve tamaño',
      'Disminución moderada tamaño',
      'Disminución severa tamaño o indetectable'
    ]
  ],
  [
    'Vestíbulo y elasticidad',
    ['Normal', 'Disminución o estenosis leve', 'Disminución o estenosis moderada', 'Disminución o estenosis severa']
  ],
  ['Color', ['Normal', 'Palidez leve', 'Palidez moderada', 'Palidez severa']],
  ['Molestias y dolor', ['No', 'Leve durante coito', 'Moderado durante coito', 'Severo durante coito']]
];
const fsfiQuestions = [
  '¿Con qué frecuencia experimentó deseo o interés sexual?',
  '¿Con qué frecuencia sintió excitación sexual durante la actividad sexual o coito vaginal?',
  '¿Con qué frecuencia consiguió lubricación vaginal (humedad vaginal) durante la actividad sexual o coito vaginal?',
  'Cuando tuvo una estimulación sexual o coito vaginal, ¿con qué frecuencia consiguió el orgasmo (clímax)?',
  '¿Cuánta satisfacción sintió con su vida sexual en general?',
  '¿Con cuánta frecuencia sintió molestias o dolor después del coito vaginal?'
];
const frequency = {
  siempre: 'Casi siempre o siempre',
  mayoria: 'La mayoría de las veces (más de la mitad de las veces)',
  mitad: 'A veces (aproximadamente la mitad de las veces)',
  pocas: 'Pocas veces (menos de la mitad de las veces)',
  nunca: 'Casi nunca o nunca'
};
const cervantesQuestions = [
  'Tengo sensación de sequedad en mis genitales (vulva o vagina)',
  'Tengo molestias en mis genitales, como escozor, ardor, picor',
  'Se me escapa la orina al hacer esfuerzos',
  'Tengo que ir rápido al baño porque si no se me escapa la orina',
  'Mis molestias genitales me limitan mis actividades cotidianas (trabajas, actividades domésticas, aseo, etc)',
  'Noto molestias genitales al caminar o hacer ejercicio',
  'Noto molestias genitales por la noche y me limitan el descanso',
  'Mis molestias genitales condicionan la elección de mi ropa interior',
  'Estoy preocupada por mis molestias genitales',
  'El actual aspecto de mis genitales no me agrada',
  'Los síntomas que noto me hacen sentirme mayor',
  'Mis molestias genitales hacen que disminuya mi deseo sexual',
  'Tengo dolor durante la actividad sexual',
  'Mi vida sexual no es satisfactoria debido a mis síntomas genitales',
  'Siento poca lubricación/sequedad durante la actividad sexual'
];

export function createTheraInstrument(visit: TheraVisit) {
  const baseline = visit === 'V0';
  const fullAssessment = ['V0', 'V1', 'V2', 'V4'].includes(visit);
  const cervantes = ['V0', 'V2', 'V4'].includes(visit);
  const hasDeviceQuestion = visit === 'V0' || visit === 'V1';
  const visitTitle = {
    V0: 'Visita basal',
    V1: 'Primera visita',
    V2: 'Segunda visita',
    V3: 'Tercera visita',
    V4: 'Cuarta visita'
  }[visit];
  const studyDescription =
    'Eficacia de las infiltraciones vaginales de complejos híbridos cooperativos de ácido hialurónico para el tratamiento del síndrome genitourinario de la menopausia en mujeres con antecedentes de cáncer de mama.';
  const shape: { [key: string]: z.ZodType<FormInstrument.Data[string]> } = {
    _thera_test_dates: z.boolean().optional(),
    study_visit: z.string().optional(),
    patient_code: requiredText,
    site_hospital: requiredText,
    visit_date: dateSchema
  };
  const groups: Group[] = [
    {
      title: 'Datos de la visita',
      description:
        'Fechas en formato DD/MM/AAAA. Introduzca una fecha válida dentro del periodo permitido para desbloquear las demás preguntas. La identificación del investigador queda vinculada a la sesión autenticada.',
      fields: {
        patient_code: baseline
          ? text('Código de paciente')
          : { kind: 'string', variant: 'select', label: 'Código de paciente *', options: {} },
        site_hospital: { kind: 'string', variant: 'select', label: 'Hospital *', options: {} },
        visit_date: dateField('Fecha de visita')
      }
    }
  ];
  const active = (data: Values) =>
    !baseline ||
    (data.informed_consent === 'si' &&
      Boolean(theraDateToISO(data.consent_date)) &&
      THERA_INCLUSIONS.every((key) => data[key] === 'si'));
  const addGroup = (title: string, fields: Fields, description?: string) =>
    groups.push({ title, fields, ...(description ? { description } : {}) });
  const clinical = (field: Field, extraDeps: string[] = [], predicate: (data: Values) => boolean = () => true) =>
    conditional(
      field,
      [...(baseline ? clinicalVisibilityDeps : []), ...extraDeps],
      (data) => active(data) && predicate(data)
    );
  const requiredWhen: { deps: string[]; key: string; predicate: (data: Values) => boolean }[] = [];

  function addClinical(
    key: string,
    schema: z.ZodType<FormInstrument.Data[string]>,
    field: Field,
    fields: Fields,
    deps: string[] = [],
    predicate: (data: Values) => boolean = () => true
  ) {
    shape[key] = schema.optional();
    fields[key] = clinical({ ...field, label: requiredLabel(field.label) }, deps, predicate);
    requiredWhen.push({ key, deps, predicate: (data) => active(data) && predicate(data) });
  }

  if (!baseline) {
    shape.baseline_date = dateSchema;
    groups[0]!.fields.baseline_date = dateField('Fecha basal guardada', true);
    if (visit !== 'V1') {
      shape.first_visit_date = dateSchema;
      groups[0]!.fields.first_visit_date = dateField('Fecha guardada de la primera visita (pauta completa)', true);
    }
  }

  if (baseline) {
    shape.informed_consent = z.enum(['si', 'no']);
    shape.consent_date = optionalDate;
    addGroup('Consentimiento informado', {
      informed_consent: radio('¿La paciente ha firmado el consentimiento informado?'),
      consent_date: conditional(
        dateField('Fecha de firma del consentimiento'),
        ['informed_consent'],
        (data) => data.informed_consent === 'si'
      )
    });
    const inclusionLabels = [
      'El paciente presenta antecedentes de cáncer de mama hormonodependiente y está libre de enfermedad',
      'El paciente presenta un estado posmenopáusico natural o inducido, definido por criterios STRAW+10',
      'El paciente presenta atrofia vulvovaginal: índice de salud vaginal <15 o dispareunia y/o sequedad vaginal EVA ≥5',
      'El paciente tiene ≥18 años y ha firmado el consentimiento informado'
    ];
    const exclusionLabels = [
      'El paciente presenta una contraindicación o advertencia para el uso de complejos híbridos cooperativos de ácido hialurónico según la IFU (p.ej. inflamación, embarazo, lactancia, alergia)',
      'El paciente presenta lesiones vaginales, cervicales o genitales; sangrado genital no investigado; enfermedad cutánea en la zona a tratar; predisposición a cicatrices hipertróficas o queloides',
      'El paciente presenta trastornos de coagulación o cáncer cervical, de ovario o uterino en el momento de la inclusión',
      'El paciente presenta infección bacteriana, fúngica o vírica vulvovaginal o urinaria, o ha recibido tratamiento para dichas afecciones en el último mes',
      'El paciente ha recibido infiltraciones vaginales de ácido hialurónico, radiofrecuencia, PRP o láser vaginal en el último año',
      'El paciente no puede cumplir los procedimientos, no es candidato adecuado a juicio del investigador o participa en otro estudio relacionado'
    ];
    const consentGate = (field: Field) =>
      conditional(field, ['informed_consent'], (data) => data.informed_consent === 'si');
    const inclusionFields: Fields = {};
    const exclusionFields: Fields = {};
    THERA_INCLUSIONS.forEach((key, index) => {
      shape[key] = z.enum(['si', 'no']).optional();
      inclusionFields[key] = consentGate(radio(`${index + 1}. ${inclusionLabels[index]}`));
    });
    THERA_EXCLUSIONS.forEach((key, index) => {
      shape[key] = z.enum(['si', 'no']).optional();
      exclusionFields[key] = consentGate(radio(`${index + 1}. ${exclusionLabels[index]}`));
    });
    addGroup('Criterios de inclusión (todos deben ser SÍ)', inclusionFields);
    addGroup('Criterios de exclusión (todos deben ser NO)', exclusionFields);
  }

  {
    const evaFields: Fields = {};
    for (const [key, label] of [
      ['eva_dryness', 'Sequedad vaginal'],
      ['eva_dyspareunia', 'Dispareunia (dolor)']
    ]) {
      shape[key!] = z.number().int().min(0).max(10).optional();
      const field: Field = {
        kind: 'number',
        variant: 'input',
        label: requiredLabel(`${label!} (0–10)`),
        description: 'Introduzca un número entero del 0 al 10. 0 = sin síntomas; 10 = máxima intensidad imaginable.',
        min: 0,
        max: 10
      };
      evaFields[key!] = baseline
        ? conditional(field, ['informed_consent'], (data) => data.informed_consent === 'si')
        : field;
    }
    addGroup(
      'Escala visual análoga para síndrome genitourinario',
      evaFields,
      'Escala del 0 al 10: marque el número que mejor describa la intensidad de la sequedad vaginal y el dolor genital. El 0 significa que no presenta síntomas y el 10 la máxima intensidad imaginable. De forma orientativa: 1-3 = leve, 4-6 = moderado y 7-10 = intenso.'
    );
    if (fullAssessment) {
      const vaginalFields: Fields = {};
      THERA_VAGINAL_ITEMS.forEach((key, index) => {
        shape[key] = z.number().int().min(1).max(5).optional();
        const [label, labels] = vaginalLabels[index]!;
        vaginalFields[key] = baseline
          ? conditional(
              score(label, optionsFrom(labels)),
              ['informed_consent'],
              (data) => data.informed_consent === 'si'
            )
          : score(label, optionsFrom(labels));
      });
      addGroup(
        'Índice de salud vaginal (investigador)',
        vaginalFields,
        'El investigador deberá completar el índice de salud vaginal. Debe seleccionar el valor (1-5) correspondiente para cada uno de los cinco parámetros (elasticidad vaginal, secreciones, pH, integridad de la mucosa e hidratación) según la exploración ginecológica. La puntuación total (5-25) se obtiene sumando los ítems. Valores más bajos indican mayor atrofia vaginal y valores más altos mejor estado vaginal.'
      );
      const fsfiFields: Fields = {};
      fsfiQuestions.forEach((label, index) => {
        const options = index === 0 ? frequency : { sin_actividad: 'Sin actividad sexual', ...frequency };
        addClinical(
          `fsfi_${index + 1}`,
          z.enum(Object.keys(options) as [string, ...string[]]),
          radio(`${index + 1}. ${label}`, options),
          fsfiFields
        );
      });
      addGroup(
        'Función sexual femenina (FSFI-6)',
        fsfiFields,
        'Responda a cada pregunta pensando en su experiencia durante las últimas 4 semanas y marque la opción que mejor la describa. No existen preguntas correctas o incorrectas. Es importante contestar con sinceridad. Si no ha tenido actividad sexual en este periodo, seleccione la opción “Sin actividad sexual” cuando corresponda. Toda la información será tratada de forma confidencial.'
      );
      const vulvarFields: Fields = {};
      THERA_VULVAR_ITEMS.forEach((key, index) => {
        const [label, labels] = vulvarLabels[index]!;
        addClinical(key, z.number().int().min(0).max(3), score(label, optionsFrom(labels, 0)), vulvarFields);
      });
      addGroup(
        'Índice de salud vulvar (investigador)',
        vulvarFields,
        'El investigador deberá completar el índice de salud vulvar. Debe seleccionar la puntuación (0-3) para cada ítem (labios menores y mayores, clítoris, vestíbulo y elasticidad, color, y dolor) según la exploración ginecológica. La suma total indica el grado de afectación. Puntuaciones: 0-5 corresponde a atrofia leve; 5-10 moderada; >10 corresponde a atrofia severa.'
      );
    }
    if (cervantes) {
      const cervantesFields: Fields = {};
      cervantesQuestions.forEach((label, index) => {
        if (index === 11) {
          addClinical(
            'sexual_activity_4_weeks',
            z.enum(['si', 'no']),
            radio('¿Ha tenido actividad sexual en las últimas 4 semanas? (coito, masturbación, caricias, etc.)'),
            cervantesFields
          );
        }
        addClinical(
          `cervantes_${index + 1}`,
          z.number().int().min(1).max(5),
          score(
            `${index + 1}. ${label}`,
            optionsFrom([
              'En total desacuerdo',
              'En desacuerdo',
              'Ni en acuerdo ni en desacuerdo',
              'De acuerdo',
              'Totalmente de acuerdo'
            ])
          ),
          cervantesFields,
          index >= 11 ? ['sexual_activity_4_weeks'] : [],
          index >= 11 ? (data) => data.sexual_activity_4_weeks === 'si' : () => true
        );
      });
      addGroup(
        'Calidad de vida (Escala Cervantes-SGM)',
        cervantesFields,
        'Por favor lea atentamente cada una de las preguntas que vienen a continuación. Este cuestionario le pide que responda según una escala del 1 al 5, donde 1 significa “totalmente en desacuerdo” y 5 “totalmente de acuerdo”, con opciones intermedias. Las preguntas se refieren a posibles síntomas o molestias en la zona genital (vulva y/o vagina) durante las últimas 4 semanas. Algunas preguntas (12 a 15) tratan sobre la actividad sexual (relaciones, caricias o masturbación) y solo debe responderlas si ha tenido actividad sexual. Le pedimos que responda con sinceridad y sin pensarlo demasiado, ya que no hay respuestas correctas o incorrectas. El cuestionario es confidencial. Es importante contestar todas las preguntas que correspondan, ya que si alguna queda en blanco, el cuestionario podría no ser válido.'
      );
    }
    if (visit === 'V3') {
      const fields: Fields = {};
      const options = {
        no_evaluado: 'No evaluado',
        mucho_mejor: 'Mucho mejor',
        poco_mejor: 'Un poco mejor',
        igual: 'Igual',
        poco_peor: 'Un poco peor',
        bastante_peor: 'Bastante peor',
        mucho_peor: 'Mucho peor'
      };
      addClinical(
        'pgi_i',
        z.enum(Object.keys(options) as [string, ...string[]]),
        radio('¿Cómo se ha sentido en general desde que empezó el tratamiento?', options),
        fields
      );
      addGroup('Mejoría global del paciente (PGI-I)', fields);
    }
  }

  if (baseline) {
    const fields: Fields = {};
    addClinical('age', z.number().int().min(18).max(120), numeric('Edad (años)', 18, 120), fields);
    addClinical('weight', z.number().min(20).max(300), numeric('Peso (kg)', 20, 300), fields);
    addClinical('height', z.number().min(100).max(250), numeric('Altura (cm)', 100, 250), fields);
    const single = (key: string, label: string, options: { [key: string]: string } = yesNo) =>
      addClinical(key, z.enum(Object.keys(options) as [string, ...string[]]), radio(label, options), fields);
    const dependentText = (key: string, label: string, dep: string, value = 'si') =>
      addClinical(key, requiredText, text(label), fields, [dep], (data) => data[dep] === value);
    const multi = (key: string, label: string, options: { [key: string]: string }, dep: string, value = 'si') =>
      addClinical(
        key,
        z.set(z.enum(Object.keys(options) as [string, ...string[]])).min(1),
        { kind: 'set', variant: 'select', label, options },
        fields,
        [dep],
        (data) => data[dep] === value
      );
    const otherText = (key: string, dep: string, parent: string) =>
      addClinical(
        key,
        requiredText,
        text('Otro: especificar'),
        fields,
        [dep, parent],
        (data) => data[parent] === 'si' && data[dep] instanceof Set && data[dep].has('otro')
      );
    const historicalDate = (key: string, label: string, deps: string[], predicate: (data: Values) => boolean) =>
      addClinical(key, dateSchema, dateField(label), fields, deps, predicate);
    single('ethnicity', 'Etnia', { caucasica: 'Caucásica', africana: 'Africana', asiatica: 'Asiática', otra: 'Otra' });
    dependentText('ethnicity_other', 'Otra etnia: especificar', 'ethnicity', 'otra');
    addGroup('Datos sociodemográficos', { ...fields });
    for (const key of Object.keys(fields)) delete fields[key];
    single('menopause_type', '¿Qué tipo de menopausia tuvo?', {
      natural: 'Natural',
      quirurgica: 'Quirúrgica',
      farmacoinducida: 'Farmacoinducida'
    });
    single('childbirth', '¿Ha tenido algún parto?');
    multi(
      'childbirth_types',
      'Tipos de parto (seleccione todos los que correspondan)',
      {
        vaginal_sin: 'Vaginal sin episiotomía',
        vaginal_con: 'Vaginal con episiotomía',
        instrumental: 'Vaginal con fórceps/ventosa',
        cesarea: 'Cesárea'
      },
      'childbirth'
    );
    single('vaginal_surgery', '¿Ha tenido algún tipo de cirugía vaginal?');
    addGroup('Datos gineco-obstétricos', { ...fields });
    for (const key of Object.keys(fields)) delete fields[key];
    historicalDate('breast_cancer_diagnosis_date', 'Fecha del diagnóstico de cáncer de mama', [], () => true);
    single('breast_cancer_surgery', '¿Ha sido intervenida por su cáncer de mama?');
    single('chemotherapy', '¿Ha llevado a cabo tratamiento con quimioterapia?');
    historicalDate(
      'chemotherapy_end_date',
      'Fecha de finalización de quimioterapia',
      ['chemotherapy'],
      (data) => data.chemotherapy === 'si'
    );
    single('hormonal_treatment', '¿Ha llevado a cabo tratamiento hormonal?');
    multi(
      'hormonal_types',
      'Tipo de tratamiento hormonal',
      { tamoxifeno: 'Tamoxifeno', aromatasa: 'Inhibidores de la aromatasa', otro: 'Otro' },
      'hormonal_treatment'
    );
    otherText('hormonal_other', 'hormonal_types', 'hormonal_treatment');
    addClinical(
      'hormonal_ongoing',
      z.enum(['si', 'no']),
      radio('¿Actualmente sigue en tratamiento hormonal?'),
      fields,
      ['hormonal_treatment'],
      (data) => data.hormonal_treatment === 'si'
    );
    historicalDate(
      'hormonal_end_date',
      'Fecha de finalización del tratamiento hormonal',
      ['hormonal_treatment', 'hormonal_ongoing'],
      (data) => data.hormonal_treatment === 'si' && data.hormonal_ongoing === 'no'
    );
    single('pelvic_radiotherapy', '¿Ha recibido radioterapia genital/pélvica?');
    historicalDate(
      'radiotherapy_end_date',
      'Fecha de finalización de radioterapia',
      ['pelvic_radiotherapy'],
      (data) => data.pelvic_radiotherapy === 'si'
    );
    single('other_cancer', '¿Ha tenido algún otro cáncer además del cáncer de mama?');
    multi(
      'other_cancer_types',
      'Indique qué otro cáncer',
      {
        cervical: 'Cáncer de cuello uterino',
        ovario: 'Cáncer de ovario',
        utero: 'Cáncer de endometrio/útero',
        otro: 'Otros'
      },
      'other_cancer'
    );
    otherText('other_cancer_other', 'other_cancer_types', 'other_cancer');
    addGroup('Antecedentes oncológicos', { ...fields });
    for (const key of Object.keys(fields)) delete fields[key];
    historicalDate(
      'genital_symptoms_diagnosis_date',
      'Fecha del diagnóstico de los síntomas genitales',
      [],
      () => true
    );
    single(
      'oncology_symptoms_relation',
      '¿Los síntomas genitales están relacionados con el tratamiento oncológico recibido?',
      {
        no: 'No están relacionados',
        inducidos: 'Fueron inducidos por el tratamiento',
        empeorados: 'Empeoraron a consecuencia del tratamiento'
      }
    );
    single(
      'recent_genital_treatment',
      '¿Ha utilizado algún tratamiento para sus síntomas genitales en las últimas 4 semanas?'
    );
    multi(
      'genital_treatment_types',
      'Tipo de tratamiento',
      {
        lubricantes: 'Lubricantes vaginales',
        hidratantes: 'Cremas hidratantes',
        estrogenos: 'Estrógenos locales',
        ospemifeno: 'Ospemifeno',
        prasterona: 'Prasterona',
        otro: 'Otro'
      },
      'recent_genital_treatment'
    );
    otherText('genital_treatment_other', 'genital_treatment_types', 'recent_genital_treatment');
    addGroup('Síndrome genitourinario de la menopausia', { ...fields });
    for (const key of Object.keys(fields)) delete fields[key];
    single('currently_sexually_active', 'Actualmente, ¿es sexualmente activa?');
    addClinical(
      'vaginal_penetration',
      z.enum(['si', 'no']),
      radio('¿En su actividad sexual suele incluir penetración vaginal?'),
      fields,
      ['currently_sexually_active'],
      (data) => data.currently_sexually_active === 'si'
    );
    addGroup('Actividad sexual actual', { ...fields });
  }

  {
    const fields: Fields = {};
    if (hasDeviceQuestion) {
      addClinical(
        'device_deficiency',
        z.enum(['si', 'no']),
        radio('¿Se ha observado alguna deficiencia del producto?'),
        fields
      );
      addClinical(
        'device_deficiency_description',
        requiredText,
        text('Especifique la deficiencia del producto'),
        fields,
        ['device_deficiency'],
        (data) => data.device_deficiency === 'si'
      );
    }
    addClinical(
      'serious_adverse_event',
      z.enum(['si', 'no']),
      radio('¿Ha presentado algún acontecimiento adverso grave durante el periodo de estudio?'),
      fields
    );
    const eventSchema = z.object({
      onset_date: dateSchema,
      event_type: z.enum(['grave', 'deficiencia', 'ambos']),
      description: requiredText,
      device_problem: requiredText,
      clinical_signs: requiredText,
      action_evolution: requiredText,
      causality: requiredText,
      serious_unexpected_device_effect: z.enum(['si', 'no']),
      status: z.enum(['en_curso', 'resuelto']),
      status_detail: requiredText,
      resolution_date: optionalDate
    });
    const eventField: Field = {
      kind: 'record-array',
      label: 'Acontecimientos adversos graves',
      fieldset: {
        onset_date: dateField('Fecha de inicio'),
        description: { kind: 'string', variant: 'textarea', label: 'Descripción del evento *' },
        device_problem: text('Problema del dispositivo (indique «no aplica» si procede)'),
        clinical_signs: text('Signos y síntomas clínicos (indique «no aplica» si procede)'),
        action_evolution: { kind: 'string', variant: 'textarea', label: 'Acción/tratamiento y evolución clínica *' },
        causality: text('Relación con el dispositivo (causalidad, texto libre)'),
        serious_unexpected_device_effect: radio('¿Efecto adverso grave o imprevisto relacionado con el dispositivo?'),
        status: radio('Estado técnico del evento', { en_curso: 'En curso', resuelto: 'Resuelto' }),
        status_detail: text('Detalle del estado del evento'),
        resolution_date: {
          kind: 'dynamic',
          render: (data) => (data.status === 'resuelto' ? dateField('Fecha de resolución') : null)
        }
      }
    };
    addClinical(
      'adverse_event_records',
      z.array(eventSchema.omit({ event_type: true })).min(1),
      eventField,
      fields,
      ['serious_adverse_event'],
      (data) => data.serious_adverse_event === 'si'
    );
    if (hasDeviceQuestion) {
      addClinical(
        'device_deficiency_records',
        z.array(eventSchema.omit({ event_type: true })).min(1),
        { ...eventField, label: 'Deficiencias del dispositivo' },
        fields,
        ['device_deficiency'],
        (data) => data.device_deficiency === 'si'
      );
    }
    const deviceFields: Fields = {};
    for (const key of ['device_deficiency', 'device_deficiency_description', 'device_deficiency_records']) {
      if (fields[key]) {
        deviceFields[key] = fields[key];
        delete fields[key];
      }
    }
    if (hasDeviceQuestion) addGroup('Deficiencias del dispositivo', deviceFields);
    addGroup('Acontecimientos adversos graves', fields, 'Añada un registro por acontecimiento.');
  }

  if (hasDeviceQuestion) {
    const fields: Fields = {};
    addClinical(
      'injections_performed',
      z.enum(['si', 'no']),
      radio('¿Se realizaron las inyecciones vaginales?'),
      fields
    );
    addClinical(
      'injections_not_performed_reason',
      requiredText,
      text('Si no, especifique el motivo'),
      fields,
      ['injections_performed'],
      (data) => data.injections_performed === 'no'
    );
    const injected = (data: Values) => data.injections_performed === 'si';
    addClinical(
      'injection_count',
      z.number().int().min(1),
      numeric('Número total de inyecciones administradas', 1),
      fields,
      ['injections_performed'],
      injected
    );
    addClinical(
      'injection_sites',
      z.set(z.enum(['1', '2', '3', '4', '5', '6', 'otro'])).min(1),
      {
        kind: 'set',
        variant: 'select',
        label: 'Localización de las inyecciones',
        options: { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', otro: 'Otra localización' }
      },
      fields,
      ['injections_performed'],
      injected
    );
    addClinical(
      'injection_site_comment',
      requiredText,
      text('Especifique la otra localización'),
      fields,
      ['injections_performed', 'injection_sites'],
      (data) => injected(data) && data.injection_sites instanceof Set && data.injection_sites.has('otro')
    );
    addClinical(
      'injection_volume_ml',
      z.number().positive(),
      numeric('Volumen total de producto utilizado (mL)', 0),
      fields,
      ['injections_performed'],
      injected
    );
    addGroup(
      'Datos sobre la intervención',
      fields,
      '![Localización numerada de las inyecciones](thera-injection-sites.png)'
    );
  }

  const sectionOrder = [
    'Datos de la visita',
    'Consentimiento informado',
    'Criterios de inclusión (todos deben ser SÍ)',
    'Criterios de exclusión (todos deben ser NO)',
    'Datos sociodemográficos',
    'Datos gineco-obstétricos',
    'Antecedentes oncológicos',
    'Síndrome genitourinario de la menopausia',
    'Actividad sexual actual',
    'Escala visual análoga para síndrome genitourinario',
    'Índice de salud vaginal (investigador)',
    'Índice de salud vulvar (investigador)',
    'Función sexual femenina (FSFI-6)',
    'Calidad de vida (Escala Cervantes-SGM)',
    'Mejoría global del paciente (PGI-I)',
    'Datos sobre la intervención',
    'Deficiencias del dispositivo',
    'Acontecimientos adversos graves'
  ];
  groups.sort((a, b) => sectionOrder.indexOf(a.title ?? '') - sectionOrder.indexOf(b.title ?? ''));

  const cleanInactive = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const clean: Values = { ...value };
    requiredWhen.forEach(({ key, predicate }) => {
      if (!predicate(clean)) delete clean[key];
    });
    if (baseline && clean.informed_consent !== 'si') {
      [
        'consent_date',
        'age',
        ...THERA_INCLUSIONS,
        ...THERA_EXCLUSIONS,
        'eva_dryness',
        'eva_dyspareunia',
        ...THERA_VAGINAL_ITEMS
      ].forEach((key) => delete clean[key]);
    }
    for (const key of ['adverse_event_records', 'device_deficiency_records']) {
      if (!Array.isArray(clean[key])) continue;
      clean[key] = clean[key].map((event: unknown) => {
        if (!event || typeof event !== 'object' || Array.isArray(event)) return event;
        const result: Values = { ...event };
        if (result.status !== 'resuelto') delete result.resolution_date;
        return result;
      });
    }
    delete clean.eligibility_info;
    return clean;
  };
  const parsedSchema = z
    .preprocess(
      cleanInactive,
      z.object(shape).superRefine((data, ctx) => {
        const visitDate = theraDateToISO(data.visit_date);
        const issue = (key: string, message: string) =>
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
        const dateError = theraVisitDateError(visit, data);
        if (dateError) issue('visit_date', dateError);
        const requireValue = (key: string) => {
          if (data[key] === undefined || data[key] === '' || (data[key] instanceof Set && data[key].size === 0))
            issue(key, 'Este campo es obligatorio');
        };
        if (baseline && data.informed_consent === 'no') {
          issue('informed_consent', 'No se puede continuar sin consentimiento informado firmado.');
        }
        if (baseline && data.informed_consent === 'si') {
          [
            'consent_date',
            'age',
            ...THERA_INCLUSIONS,
            ...THERA_EXCLUSIONS,
            'eva_dryness',
            'eva_dyspareunia',
            ...THERA_VAGINAL_ITEMS
          ].forEach(requireValue);
          THERA_INCLUSIONS.forEach((key) => {
            if (data[key] === 'no') issue(key, 'Este criterio de inclusión debe marcarse como "Sí".');
          });
          THERA_EXCLUSIONS.forEach((key) => {
            if (data[key] === 'si') issue(key, 'Este criterio de exclusión debe marcarse como "No".');
          });
          if (visitDate && typeof data.consent_date === 'string' && data.consent_date > visitDate)
            issue('consent_date', 'El consentimiento debe ser anterior o igual a la visita basal');
          if (typeof data.age === 'number' && data.age < 18) {
            issue('age', 'La paciente debe tener al menos 18 años.');
            if (data.inclusion_4 === 'si') issue('inclusion_4', 'La edad registrada es inferior a 18 años');
          }
          const vhi = theraSum(data, THERA_VAGINAL_ITEMS);
          if (
            data.inclusion_3 === 'si' &&
            vhi !== undefined &&
            !(vhi < 15 || Number(data.eva_dryness) >= 5 || Number(data.eva_dyspareunia) >= 5)
          )
            issue('inclusion_3', 'El índice vaginal y las EVA no cumplen este criterio');
        }
        requiredWhen.forEach(({ key, predicate }) => {
          if (predicate(data)) requireValue(key);
        });
        if (data.study_visit !== undefined && data.study_visit !== visit)
          issue('study_visit', 'El tipo de visita no coincide con este instrumento');
        if (!baseline) {
          ['eva_dryness', 'eva_dyspareunia', ...(fullAssessment ? THERA_VAGINAL_ITEMS : [])].forEach(requireValue);
        }
        for (const key of [
          'breast_cancer_diagnosis_date',
          'chemotherapy_end_date',
          'hormonal_end_date',
          'radiotherapy_end_date',
          'genital_symptoms_diagnosis_date'
        ]) {
          const rule = requiredWhen.find((item) => item.key === key);
          if (visitDate && rule?.predicate(data) && typeof data[key] === 'string' && data[key] > visitDate)
            issue(key, 'La fecha no puede ser posterior a la visita');
        }
        for (const key of ['chemotherapy_end_date', 'hormonal_end_date', 'radiotherapy_end_date']) {
          const rule = requiredWhen.find((item) => item.key === key);
          if (
            rule?.predicate(data) &&
            typeof data[key] === 'string' &&
            typeof data.breast_cancer_diagnosis_date === 'string' &&
            data[key] < data.breast_cancer_diagnosis_date
          )
            issue(key, 'La finalización no puede preceder al diagnóstico oncológico');
        }
        if (active(data)) {
          for (const table of ['adverse_event_records', 'device_deficiency_records']) {
            const events = data[table];
            if (!Array.isArray(events)) continue;
            const eventIssue = (index: number, key: string, message: string) =>
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: [table, index, key], message });
            events.forEach((event, index) => {
              if (visitDate && typeof event.onset_date === 'string' && event.onset_date > visitDate)
                eventIssue(index, 'onset_date', 'El inicio no puede ser posterior a la visita');
              if (event.status === 'resuelto' && !event.resolution_date)
                eventIssue(index, 'resolution_date', 'Indique la fecha de resolución');
              if (
                typeof event.resolution_date === 'string' &&
                event.status === 'resuelto' &&
                ((typeof event.onset_date === 'string' && event.resolution_date < event.onset_date) ||
                  (visitDate !== undefined && event.resolution_date > visitDate))
              )
                eventIssue(index, 'resolution_date', 'La resolución debe estar entre el inicio y la visita');
            });
          }
        }
      })
    )
    .transform((data) => ({ ...data, study_visit: visit, ...(visit === 'V4' ? { completed_study: true } : {}) }));

  const validationSchema: z.ZodType<FormInstrument.Data, z.ZodTypeDef, unknown> = z
    .unknown()
    .transform((value, ctx) => {
      const result = parsedSchema.safeParse(value);
      if (result.success) return result.data;
      const errors = new Map<string, { path: (string | number)[]; messages: Set<string> }>();
      for (const issue of result.error.issues) {
        const key = JSON.stringify(issue.path);
        const error = errors.get(key) ?? { path: issue.path, messages: new Set<string>() };
        error.messages.add(issue.message);
        errors.set(key, error);
      }
      for (const error of errors.values()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: error.path, message: [...error.messages].join(' ') });
      }
      return z.NEVER;
    });

  for (const group of groups) {
    for (const [key, field] of Object.entries(group.fields)) {
      if (!field || ['patient_code', 'visit_date', 'baseline_date', 'first_visit_date'].includes(key)) continue;
      group.fields[key] = {
        kind: 'dynamic',
        deps: [
          ...new Set([
            'visit_date',
            'baseline_date',
            'first_visit_date',
            ...(field.kind === 'dynamic' ? field.deps : [])
          ])
        ],
        render(data) {
          const rendered = field.kind === 'dynamic' ? field.render(data) : field;
          return rendered
            ? { ...rendered, disabled: Boolean(rendered.disabled || theraVisitDateError(visit, data)) }
            : null;
        }
      };
    }
  }

  return defineInstrument({
    kind: 'FORM',
    language: 'en',
    internal: { name: THERA_NAMES[visit], edition: 7 },
    tags: ['THERA-SGM-2026', 'CRF', visit],
    clientDetails: {
      estimatedDuration: { V0: 40, V1: 25, V2: 25, V3: 10, V4: 25 }[visit],
      instructions: [
        [
          baseline
            ? 'Complete el formulario con la información disponible en la historia clínica y las respuestas de la paciente. Registre el consentimiento informado y compruebe los criterios de inclusión y exclusión.'
            : 'Complete la visita de seguimiento con la información de la historia clínica, las respuestas de la paciente y la exploración correspondiente.',
          'Complete los campos marcados con asterisco e introduzca las fechas en formato DD/MM/AAAA o selecciónelas en el calendario.',
          'Si no puede completar el formulario en una sola sesión, puede guardarlo como borrador y continuar en otro momento. Revise la información antes de enviarlo.'
        ].join(' ')
      ]
    },
    details: {
      title: `THERA-SGM-2026 · ${visitTitle}`,
      description: studyDescription,
      license: 'FREE-NOS',
      authors: ['Laura Baquedano Mainar']
    },
    content: groups,
    measures: {
      ...(visit === 'V4'
        ? { completed_study: { kind: 'computed', label: 'Estudio completado', value: () => true } }
        : {}),
      ...(fullAssessment
        ? {
            vaginal_health_total: {
              kind: 'computed',
              label: 'Índice de salud vaginal (5-25)',
              value: (data: Values) => theraSum(data, THERA_VAGINAL_ITEMS)
            },
            vulvar_health_total: {
              kind: 'computed',
              label: 'Índice de salud vulvar (0-15), sin categoría',
              value: (data: Values) => theraSum(data, THERA_VULVAR_ITEMS)
            }
          }
        : {}),
      ...(baseline
        ? {
            eligible: {
              kind: 'computed',
              label: 'Apta para seguimiento',
              value: (data: Values) => isTheraEligible(data)
            }
          }
        : {})
    },
    validationSchema
  });
}
