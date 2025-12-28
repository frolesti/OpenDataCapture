import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { pick, sum } from '/runtime/v1/lodash-es@4.x';
import { z } from '/runtime/v1/zod@3.x/v4';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  tags: {
    ca: ['Well-Being'],

  },
  internal: {
    edition: 1,
    name: 'DNP_HAPPINESS_QUESTIONNAIRE'
  },
  content: {
    personalLifeSatisfaction: {
      description: {
        ca: 'Please select a number from 1 to 10 (inclusive), where 1 is very dissatisfied and 10 is very satisfied.',

      },
      kind: 'number',
      label: {
        ca: 'How satisfied are you with your personal life?',

      },
      max: 10,
      min: 1,
      variant: 'slider'
    },
    professionalLifeSatisfaction: {
      description: {
        ca: 'Please select a number from 1 to 10 (inclusive), where 1 is very dissatisfied and 10 is very satisfied.',

      },
      kind: 'number',
      label: {
        ca: 'How satisfied are you with your professional life?',

      },
      max: 10,
      min: 1,
      variant: 'slider'
    },
    isSatisfiedOverall: {
      kind: 'boolean',
      label: {
        ca: 'Overall, would you say you are satisfied with your life?',

      },
      options: {
        ca: {
          true: 'Yes',
          false: 'No'
        }
      },
      variant: 'radio'
    },
    reasonNotSatisfied: {
      deps: ['isSatisfiedOverall'],
      kind: 'dynamic',
      render: (data) => {
        if (data.isSatisfiedOverall !== false) {
          return null;
        }
        return {
          label: {
            ca: 'Why do you feel dissatisfied with your life?',

          },
          isRequired: false,
          kind: 'string',
          variant: 'textarea'
        };
      }
    },
    causesOfDissatisfaction: {
      deps: ['isSatisfiedOverall'],
      kind: 'dynamic',
      render: (data) => {
        if (data.isSatisfiedOverall !== false) {
          return null;
        }
        return {
          label: {
            ca: 'Which of the following are causes of your dissatisfaction? ',

          },
          isRequired: false,
          kind: 'set',
          variant: 'listbox',
          options: {
            ca: {
              EXISTENTIAL_CRISIS: 'Existential Crisis',
              FRIENDS: 'Friends',
              ROMANTIC_PARTNER: 'Romantic Partner',
              MONEY: 'Money'
            }
          }
        };
      }
    }
  },
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: ['Please answer the questions based on your current feelings.'],

    },
    title: {
      ca: 'Questionnaire on Happiness',

    }
  },
  details: {
    description: {
      ca: 'The Happiness Questionnaire is a questionnaire about happiness.',

    },
    license: 'Apache-2.0',
    title: {
      ca: 'Happiness Questionnaire',

    }
  },
  measures: {
    personalLifeSatisfaction: {
      kind: 'const',
      ref: 'personalLifeSatisfaction',
      label: {
        ca: 'Satisfaction With Personal Life',

      }
    },
    professionalLifeSatisfaction: {
      kind: 'const',
      ref: 'professionalLifeSatisfaction',
      label: {
        ca: 'Satisfaction With Professional Life',

      }
    },
    overallLifeSatisfaction: {
      kind: 'computed',
      label: {
        ca: 'Overall Satisfaction Score',

      },
      value(data) {
        return sum(Object.values(pick(data, ['personalLifeSatisfaction', 'professionalLifeSatisfaction'])));
      }
    }
  },
  validationSchema: z
    .object({
      personalLifeSatisfaction: z.number().int().gte(1).lte(10),
      professionalLifeSatisfaction: z.number().int().gte(1).lte(10),
      isSatisfiedOverall: z.boolean(),
      reasonNotSatisfied: z.string().optional(),
      causesOfDissatisfaction: z.set(z.enum(['MONEY', 'FRIENDS', 'ROMANTIC_PARTNER', 'EXISTENTIAL_CRISIS'])).optional()
    })
    .superRefine((arg, ctx) => {
      if (!arg.isSatisfiedOverall && !arg.reasonNotSatisfied) {
        ctx.addIssue({
          code: 'custom',
          message: 'This field is required / Ce champ est obligatoire'
        });
      }
    })
});
