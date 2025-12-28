import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const likertOptions = {
  ca: {
    0: 'Not at All',
    1: 'Several Days',
    2: 'More than half the days',
    3: 'Nearly every day'
  }
};

const calculateGAD7total = (data: { [key: string]: unknown }) => {
  let sum = 0;
  for (const key in data) {
    const value = data[key as keyof typeof data];
    if (typeof value === 'number' && key != 'difficultyCoping') {
      sum += value;
    }
  }
  return sum;
};

export default defineInstrument({
  details: {
    title: {
      ca: 'Generalized Anxiety Disorder-7 (GAD-7)'
    },
    description: {
      ca: 'The Generalized Anxiety Disorder 7 (GAD-7) is a self-reported questionnaire for screening and severity measuring of generalized anxiety disorder (GAD). The GAD7 asks for self-reported anxiety symptoms over the past two weeks.'
    },
    estimatedDuration: 1,
    instructions: {
      ca: ['Please complete all questions']
    },
    license: 'PUBLIC-DOMAIN'
  },
  kind: 'FORM',
  language: ['ca'],
  tags: {
    ca: ['Anxiety']
  },
  internal: {
    name: 'GAD_7',
    edition: 1
  },
  content: [
    {
      title: {
        ca: 'Over the last two weeks, how often have you been bothered by the following problems?'
      },
      fields: {
        nervousAnxiousOnEdge: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by feeling nervous, anxious, or on edge?'
          },
          label: {
            ca: 'Feeling nervous, anxious, or on edge'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        noStopControlWorrying: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by not being able to stop or control worrying?'
          },
          label: {
            ca: 'Not being able to stop or control worrying'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        worryingTooMuch: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by worrying too much about different things?'
          },
          label: {
            ca: 'Worrying too much about different things'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        troubleRelaxing: {
          description: {
            ca: 'Over the last two weeks, how often have you had trouble relaxing?'
          },
          label: {
            ca: 'Have trouble relaxing'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        restless: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by being so restless that it is hard to sit still?'
          },
          label: {
            ca: 'Being so restless that it is hard to sit still'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        easilyAnnoyedIrritable: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by becoming easily annoyed or irritable?'
          },
          label: {
            ca: 'Becoming easily annoyed or irritable'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        },
        afraidSomethingAwful: {
          description: {
            ca: 'Over the last two weeks, how often have you been bothered by feeling afraid, as if something awful might happen?'
          },
          label: {
            ca: 'Feeling afraid, as if something awful might happen'
          },
          kind: 'number',
          options: likertOptions,
          variant: 'radio'
        }
      }
    },
    {
      title: {
        ca: ' '
      },
      fields: {
        difficultyCoping: {
          kind: 'dynamic',
          deps: [
            'nervousAnxiousOnEdge',
            'noStopControlWorrying',
            'worryingTooMuch',
            'troubleRelaxing',
            'restless',
            'easilyAnnoyedIrritable',
            'afraidSomethingAwful'
          ],
          render(data) {
            if (
              !(
                data?.nervousAnxiousOnEdge ||
                data?.noStopControlWorrying ||
                data?.worryingTooMuch ||
                data?.troubleRelaxing ||
                data?.restless ||
                data?.easilyAnnoyedIrritable ||
                data?.afraidSomethingAwful
              )
            ) {
              return null;
            }
            return {
              description: {
                ca: 'Given your problems selected above, how difficult have they made it for you to do your work, take care of things at home, or get along with other people?'
              },
              label: {
                ca: 'Given your problems selected above, how difficult have they made it for you to do your work, take care of things at home, or get along with other people?'
              },
              kind: 'number',
              options: {
                ca: {
                  0: 'Not difficult at all',
                  1: 'Somewhat difficult',
                  2: 'Very difficult',
                  3: 'Extremely difficult'
                }
              },
              variant: 'radio'
            };
          }
        }
      }
    }
  ],
  measures: {
    nervousAnxiousOnEdge: {
      kind: 'const',
      ref: 'nervousAnxiousOnEdge'
    },
    noStopControlWorrying: {
      kind: 'const',
      ref: 'noStopControlWorrying'
    },
    worryingTooMuch: {
      kind: 'const',
      ref: 'worryingTooMuch'
    },
    troubleRelaxing: {
      kind: 'const',
      ref: 'troubleRelaxing'
    },
    restless: {
      kind: 'const',
      ref: 'restless'
    },
    easilyAnnoyedIrritable: {
      kind: 'const',
      ref: 'easilyAnnoyedIrritable'
    },
    afraidSomethingAwful: {
      kind: 'const',
      ref: 'afraidSomethingAwful'
    },
    difficultyCoping: {
      kind: 'const',
      ref: 'difficultyCoping'
    },
    gad7Total: {
      kind: 'computed',
      label: {
        ca: 'Total of GAD7'
      },
      value: (data) => {
        return calculateGAD7total(data);
      }
    }
  },
  validationSchema: z.object({
    nervousAnxiousOnEdge: z.number().int().min(0).max(3),
    noStopControlWorrying: z.number().int().min(0).max(3),
    worryingTooMuch: z.number().int().min(0).max(3),
    troubleRelaxing: z.number().int().min(0).max(3),
    restless: z.number().int().min(0).max(3),
    easilyAnnoyedIrritable: z.number().int().min(0).max(3),
    afraidSomethingAwful: z.number().int().min(0).max(3),
    difficultyCoping: z.number().int().min(0).max(3).optional()
  })
});
