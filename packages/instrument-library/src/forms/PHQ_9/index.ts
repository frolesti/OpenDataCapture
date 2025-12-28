import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { omit, sum } from '/runtime/v1/lodash-es@4.x';
import { z } from '/runtime/v1/zod@3.x';

const $Response = z.number().int().min(0).max(3);

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  tags: {
    ca: ['Health', 'Depression']
  },
  internal: {
    edition: 1,
    name: 'PHQ_9'
  },
  content: [
    {
      title: {
        ca: 'Summary of Instructions'
      },
      description: {
        ca: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?'
      },
      fields: {
        questions: {
          kind: 'number-record',
          label: {
            ca: 'Questions'
          },
          items: {
            interestPleasure: {
              label: {
                ca: '1. Little interest or pleasure in doing things'
              }
            },
            feelingDown: {
              label: {
                ca: '2. Feeling down, depressed, or hopeless'
              }
            },
            sleepIssues: {
              label: {
                ca: '3. Trouble falling or staying asleep, or sleeping too much'
              }
            },
            energyLevel: {
              label: {
                ca: '4. Feeling tired or having little energy'
              }
            },
            appetiteChanges: {
              label: {
                ca: '5. Poor appetite or overeating'
              }
            },
            selfWorth: {
              label: {
                ca: '6. Feeling bad about yourself — or that you are a failure or have let yourself or your family down'
              }
            },
            concentrationIssues: {
              label: {
                ca: '7. Trouble concentrating on things, such as reading the newspaper or watching television'
              }
            },
            psychomotorChanges: {
              label: {
                ca: '8. Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual'
              }
            },
            suicidalThoughts: {
              label: {
                ca: '9. Thoughts that you would be better off dead or of hurting yourself in some way'
              }
            }
          },
          options: {
            ca: {
              0: 'Not at All',
              1: 'Several Days',
              2: 'More than half the days',
              3: 'Nearly every day'
            }
          },
          variant: 'likert'
        },
        impactOnFunctioning: {
          kind: 'dynamic',
          deps: ['questions'],
          render: (data) => {
            if (!data.questions || sum(Object.values(data.questions)) === 0) {
              return null;
            }
            return {
              disableAutoPrefix: true,
              kind: 'number',
              label: {
                ca: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?'
              },
              options: {
                ca: {
                  0: 'Not difficult at all',
                  1: 'Somewhat difficult',
                  2: 'Very difficult',
                  3: 'Extremely difficult'
                }
              },
              variant: 'select'
            };
          }
        }
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: [
        "Before beginning this test, please ensure you are in a a quiet place where you can focus without distractions. You will answer 9 questions about how you've been feeling over the past 2 weeks. Answer each question as honestly as possible based on your feelings and experiences."
      ]
    }
  },
  details: {
    description: {
      ca: 'The Patient Health Questionnaire (PHQ) is a diagnostic tool for mental health disorders used by health care professionals that is quick and easy for patients to complete. In the mid-1990s, Robert L. Spitzer, MD, Janet B.W. Williams, DSW, and Kurt Kroenke, MD, and colleagues at Columbia University developed the Primary Care Evaluation of Mental Disorders (PRIME-MD), a diagnostic tool containing modules on 12 different mental health disorders. They worked in collaboration with researchers at the Regenstrief Institute at Indiana University and with the support of an educational grant from Pfizer Inc. During the development of PRIME-MD, Drs. Spitzer, Williams and Kroenke, created the PHQ and GAD-7 screeners. The PHQ-9, a tool specific to depression, simply scores each of the 9 DSM-IV criteria based on the mood module from the original PRIME-MD.'
    },

    license: 'PUBLIC-DOMAIN',
    title: {
      ca: 'Patient Health Questionnaire (PHQ-9)'
    }
  },
  measures: {
    interestPleasure: {
      kind: 'computed',
      label: {
        ca: 'Little Interest/Pleasure'
      },
      value: ({ questions }) => questions.interestPleasure
    },
    feelingDown: {
      kind: 'computed',
      label: { ca: 'Feeling Down/Depressed', fr: 'Se sentir déprimé/triste' },
      value: ({ questions }) => questions.feelingDown
    },
    sleepIssues: {
      kind: 'computed',
      label: { ca: 'Sleep Issues', fr: 'Problèmes de sommeil' },
      value: ({ questions }) => questions.sleepIssues
    },
    energyLevel: {
      kind: 'computed',
      label: { ca: 'Low Energy', fr: 'Faible énergie' },
      value: ({ questions }) => questions.energyLevel
    },
    appetiteChanges: {
      kind: 'computed',
      label: { ca: 'Appetite Changes', fr: "Changements d'appétit" },
      value: ({ questions }) => questions.appetiteChanges
    },
    selfWorth: {
      kind: 'computed',
      label: { ca: 'Low Self-Worth', fr: 'Faible estime de soi' },
      value: ({ questions }) => questions.selfWorth
    },
    concentrationIssues: {
      kind: 'computed',
      label: { ca: 'Concentration Issues', fr: 'Problèmes de concentration' },
      value: ({ questions }) => questions.concentrationIssues
    },
    psychomotorChanges: {
      kind: 'computed',
      label: { ca: 'Psychomotor Changes', fr: 'Changements psychomoteurs' },
      value: ({ questions }) => questions.psychomotorChanges
    },
    suicidalThoughts: {
      kind: 'computed',
      label: { ca: 'Suicidal Thoughts', fr: 'Pensées suicidaires' },
      value: ({ questions }) => questions.suicidalThoughts
    },
    impactOnFunctioning: {
      kind: 'computed',
      label: { ca: 'Impact on Functioning', fr: 'Impact sur le fonctionnement' },
      value: ({ impactOnFunctioning }) => impactOnFunctioning
    },
    totalScore: {
      kind: 'computed',
      label: { ca: 'Total Score', fr: 'Score total' },
      value: ({ questions }) => sum(Object.values(omit(questions, 'impactOnFunctioning')))
    }
  },
  validationSchema: z
    .object({
      questions: z.object({
        interestPleasure: $Response,
        feelingDown: $Response,
        sleepIssues: $Response,
        energyLevel: $Response,
        appetiteChanges: $Response,
        selfWorth: $Response,
        concentrationIssues: $Response,
        psychomotorChanges: $Response,
        suicidalThoughts: $Response
      }),
      impactOnFunctioning: $Response.optional()
    })
    .superRefine(({ impactOnFunctioning, questions }, ctx) => {
      const isAnyNonZero = sum(Object.values(questions)) > 0;
      // If any response is not zero, then impactOnFunctioning is required
      if (isAnyNonZero && impactOnFunctioning === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'This question is required / Cette question est obligatoire',
          path: ['impactOnFunctioning']
        });
      }
    })
});
