import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const $NumberRange = z.number().int().min(0).max(4);

const $InstrumentData = z
  .object({
    isCannabisUsed: z.boolean(),
    cannabisFrequency: $NumberRange.optional(),
    stonedTime: $NumberRange.optional(),
    unableToStopUsage: $NumberRange.optional(),
    cannabisInducedFailure: $NumberRange.optional(),
    cannabisRelatedUsageTime: $NumberRange.optional(),
    cannabisMemoryConcentration: $NumberRange.optional(),
    cannabisHazards: $NumberRange.optional(),
    cannabisReduction: $NumberRange.optional()
  })
  .refine(({ isCannabisUsed, ...data }) => {
    if (!isCannabisUsed) {
      return true;
    }
    // in case in the future you can deselect options
    return Object.values(data).length === 8 && Object.values(data).every((arg) => typeof arg === 'number');
  }, 'Error: Please fill out all the questions / Erreur: Veuillez répondre à toutes les questions');

function createDependentField<const T>(field: T) {
  return {
    kind: 'dynamic' as const,
    deps: ['isCannabisUsed'] as const,
    render: (data: { isCannabisUsed?: unknown }) => {
      if (data.isCannabisUsed === true) {
        return field;
      }
      return null;
    }
  };
}

const calculateCannabisUse = (data: { [key: string]: unknown }) => {
  let sum = 0;
  for (const key in data) {
    const value = data[key as keyof typeof data];
    if (typeof value === 'number') {
      sum += value;
    }
  }
  return sum;
};

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  tags: {
    ca: ['Cannabis', 'Addiction', 'Substance Abuse']
  },
  internal: {
    edition: 1,
    name: 'CUDIT_R'
  },
  clientDetails: {
    estimatedDuration: 10,
    instructions: {
      ca: ['Please fill out answer that best describe your cannabis usage.']
    },
    title: {
      ca: 'Cannabis Use Disorder Identification Test - Revised (CUDIT-R)'
    }
  },
  details: {
    description: {
      ca: 'The CUDIT-R is an 8-item screening tool used to assess problematic cannabis use and identify individuals at risk of Cannabis Use Disorder (CUD). A score of 8 or higher suggests hazardous use, warranting further assessment or intervention.'
    },
    license: 'PUBLIC-DOMAIN',
    title: {
      ca: 'Cannabis Use Disorder Identification Test - Revised (CUDIT-R)'
    }
  },
  content: {
    isCannabisUsed: {
      kind: 'boolean',
      label: {
        ca: 'Have you used any cannabis over the past six months?'
      },
      options: {
        ca: {
          true: 'Yes',
          false: 'No'
        }
      },
      variant: 'radio'
    },
    cannabisFrequency: createDependentField({
      kind: 'number',
      label: {
        ca: '1. How often do you use Cannabis?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Monthly or less',
          2: '2-4 times a month',
          3: '2-3 times a week',
          4: '4 or more times a week'
        }
      },
      variant: 'radio'
    }),
    stonedTime: createDependentField({
      kind: 'number',
      label: {
        ca: '2. How many hours were you "stoned" on a typical day when you were using cannabis?'
      },
      options: {
        ca: {
          0: 'Less than 1',
          1: '1 or 2',
          2: '3 or 4',
          3: '5 or 6',
          4: '7 or more'
        }
      },
      variant: 'radio'
    }),
    unableToStopUsage: createDependentField({
      kind: 'number',
      label: {
        ca: '3. How often during the past 6 months did you find that you were not able to stop using cannabis once you had started?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Less than monthly',
          2: 'Monthly',
          3: 'Weekly',
          4: 'Daily or almost daily'
        }
      },
      variant: 'radio'
    }),
    cannabisInducedFailure: createDependentField({
      kind: 'number',
      label: {
        ca: '4. How often during the past 6 months did you fail to do what was normally expected from you because of using cannabis?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Less than monthly',
          2: 'Monthly',
          3: 'Weekly',
          4: 'Daily or almost daily'
        }
      },
      variant: 'radio'
    }),
    cannabisRelatedUsageTime: createDependentField({
      kind: 'number',
      label: {
        ca: '5. How often in the past 6 months have you devoted a great deal of your time to getting, using, or recovering from cannabis?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Less than monthly',
          2: 'Monthly',
          3: 'Weekly',
          4: 'Daily or almost daily'
        }
      },
      variant: 'radio'
    }),
    cannabisMemoryConcentration: createDependentField({
      kind: 'number',
      label: {
        ca: '6. How often in the past 6 months have you had a problem with your memory or concentration after using cannabis?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Less than monthly',
          2: 'Monthly',
          3: 'Weekly',
          4: 'Daily or almost daily'
        }
      },
      variant: 'radio'
    }),
    cannabisHazards: createDependentField({
      kind: 'number',
      label: {
        ca: '7. How often do you use cannabis in situations that could be physically hazardous, such as driving, operating machinery, or caring for children:'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Less than monthly',
          2: 'Monthly',
          3: 'Weekly',
          4: 'Daily or almost daily'
        }
      },
      variant: 'radio'
    }),
    cannabisReduction: createDependentField({
      kind: 'number',
      label: {
        ca: '8. Have you ever thought about cutting down, or stopping, your use of cannabis?'
      },
      options: {
        ca: {
          0: 'Never',
          2: 'Yes but not in the past 6 months',
          4: 'Monthly'
        }
      },
      variant: 'radio'
    })
  },
  validationSchema: $InstrumentData,
  measures: {
    cannabisFrequency: {
      kind: 'const',
      label: {
        ca: 'Cannabis Frequency'
      },
      ref: 'cannabisFrequency'
    },
    stonedTime: {
      kind: 'const',
      label: {
        ca: 'Time "Stoned"'
      },
      ref: 'stonedTime'
    },
    unableToStopUsage: {
      kind: 'const',
      label: {
        ca: 'Usage Reduction'
      },
      ref: 'unableToStopUsage'
    },
    cannabisInducedFailure: {
      kind: 'const',
      label: {
        ca: 'Cannabis induced failure'
      },
      ref: 'cannabisInducedFailure'
    },
    cannabisRelatedUsageTime: {
      kind: 'const',
      label: {
        ca: 'Cannabis usage time'
      },
      ref: 'cannabisRelatedUsageTime'
    },
    cannabisMemoryConcentration: {
      kind: 'const',
      label: {
        ca: 'Memory and Concentration'
      },
      ref: 'cannabisMemoryConcentration'
    },
    cannabisHazards: {
      kind: 'const',
      label: {
        ca: 'Cannabis Hazard Score'
      },
      ref: 'cannabisHazards'
    },
    cannabisReduction: {
      kind: 'const',
      label: {
        ca: 'Cannabis Reduction'
      },
      ref: 'cannabisReduction'
    },
    cannabisScore: {
      kind: 'computed',
      hidden: true,
      label: {
        ca: 'Cannabis use score'
      },
      value: (data) => {
        return calculateCannabisUse(data);
      }
    },
    cannabisScoreInterpretation: {
      kind: 'computed',
      hidden: true,
      label: {
        ca: 'Cannabis use score interpretation'
      },
      value: (data) => {
        const score = calculateCannabisUse(data);
        if (score >= 8 && score < 12) {
          return 'Hazardous cannabis use / Consommation dangereuse de cannabis';
        } else if (score >= 12) {
          return "Possible cannabis use disorder / Un trouble de l'usage du cannabis est probable";
        }
        return;
      }
    }
  }
});
