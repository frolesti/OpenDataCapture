import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { sum } from '/runtime/v1/lodash-es@4.x';
import { z } from '/runtime/v1/zod@3.x';

const likertScaleOptions = {
  ca: {
    0: 'Never',
    1: 'Rarely',
    2: 'Sometimes',
    3: 'Often',
    4: 'Very Often'
  }
};

const $LikertScaleValidation = z.number().int().min(0).max(4);

export default defineInstrument({
  content: {
    selfReportADHD: {
      items: {
        difficultyConcentrating: {
          label: {
            ca: 'How often do you have difficulty concentrating on what people are saying to you even when they are speaking to you directly?',

          }
        },
        restlessInappropriately: {
          label: {
            ca: 'How often do you leave your seat in meetings or other situations in which you are expected to remain seated?',

          }
        },
        difficultyRelaxing: {
          label: {
            ca: 'How often do you have difficulty unwinding and relaxing when you have time to yourself?',

          }
        },
        sentenceCompletion: {
          label: {
            ca: "When you're in a conversation, how often do you find yourself finishing the sentences of the people you are talking to before they can finish them themselves?",

          }
        },
        procrastination: {
          label: {
            ca: 'How often do you put things off until the last minute?',

          }
        },
        relyOnOthers: {
          label: {
            ca: 'How often do you depend on others to keep your life in order and attend to details?',

          }
        }
      },
      kind: 'number-record',
      label: {
        ca: 'Check the box that best describes how you have felt and conducted yourself over the past 6 months.',

      },
      options: likertScaleOptions,
      variant: 'likert'
    }
  },
  details: {
    description: {
      ca: [
        'The Adult ADHD Self-Report Scale (ASRS v1.1) and scoring system were developed in conjunction with',
        'the World Health Organization (WHO) and the Workgroup on Adult ADHD to help healthcare',
        'professionals to screen their patients for adult ADHD. Insights gained through this screening may suggest',
        'the need for a more in-depth clinician interview. The questions in the ASRS v1.1 are consistent with',
        'DSM-IV criteria and address the manifestations of ADHD symptoms in adults. The content of the',
        'questionnaire also reflects the importance that DSM-IV places on symptoms, impairments, and history for',
        'a correct diagnosis.'
      ].join(' ')
    },
    estimatedDuration: 1,
    instructions: {
      ca: ['This is a self-rated instrument, please answer all questions.'],

    },
    license: 'CC-BY-4.0',
    referenceUrl: 'http://www.hcp.med.harvard.edu/ncs/asrs.php',
    title: {
      ca: 'Adult ADHD Self-Report Screening Scale for DSM-5 (ASRS-5) v1.1',

    }
  },
  internal: {
    edition: 1,
    name: 'ADHD_ASRS_1.1'
  },
  kind: 'FORM',
  language: ['ca'],
  measures: {
    difficultyConcentrating: {
      kind: 'computed',
      label: { ca: 'Result difficulty concentrating', fr: 'Résultat difficulté de concentration' },
      value: (data) => data.selfReportADHD.difficultyConcentrating
    },
    difficultyRelaxing: {
      kind: 'computed',
      label: { ca: 'Result difficulty relaxing', fr: 'Résultat difficulté de détente' },
      value: (data) => data.selfReportADHD.difficultyRelaxing
    },
    procrastination: {
      kind: 'computed',
      label: { ca: 'Result procrastination', fr: 'Résultat procrastination' },
      value: (data) => data.selfReportADHD.procrastination
    },
    relyOnOthers: {
      kind: 'computed',
      label: { ca: 'Result relying on others', fr: 'Résultat dépendant des autres' },
      value: (data) => data.selfReportADHD.relyOnOthers
    },
    restlessInappropriately: {
      kind: 'computed',
      label: { ca: 'Result inappropriate restlessness', fr: 'Résultat agitation inappropriée' },
      value: (data) => data.selfReportADHD.restlessInappropriately
    },
    sentenceCompletion: {
      kind: 'computed',
      label: { ca: 'Result inappropriate sentence completion', fr: 'Résultat achèvement inapproprié de la phrase' },
      value: (data) => data.selfReportADHD.sentenceCompletion
    },
    totalScore: {
      kind: 'computed',
      label: { ca: 'Total ADHD Score', fr: 'Score total de TDAH' },
      value: (data) => {
        return sum(Object.values(data.selfReportADHD));
      }
    }
  },
  tags: {
    ca: ['ADHD', 'ADD'],

  },
  validationSchema: z.object({
    selfReportADHD: z.object({
      difficultyConcentrating: $LikertScaleValidation,
      difficultyRelaxing: $LikertScaleValidation,
      procrastination: $LikertScaleValidation,
      relyOnOthers: $LikertScaleValidation,
      restlessInappropriately: $LikertScaleValidation,
      sentenceCompletion: $LikertScaleValidation
    })
  })
});
