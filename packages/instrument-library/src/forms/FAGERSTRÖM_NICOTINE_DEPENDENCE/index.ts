import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { sum } from '/runtime/v1/lodash-es@4.x';
import { z } from '/runtime/v1/zod@3.x';

const yesNoOptions = {
  ca: {
    1: 'Yes',
    0: 'No'
  }
};

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    name: 'FAGERSTRÖM_NICOTINE_DEPENDENCE',
    edition: 1
  },
  tags: {
    ca: ['smoking', 'addiction', 'nicotine'],

  },
  details: {
    description: {
      ca: 'The Fagerström Test for Nicotine Dependence is a standard instrument for assessing the intensity of physical addiction to nicotine. The test was designed to provide an ordinal measure of nicotine dependence related to cigarette smoking. It contains six items that evaluate the quantity of cigarette consumption, the compulsion to use, and dependence.',

    },
    estimatedDuration: 5,
    instructions: {
      ca: ['Please respond to every question'],

    },
    license: 'PUBLIC-DOMAIN',
    title: {
      ca: 'Fagerström Nicotine Dependence (FTND)',

    }
  },

  content: {
    smokeTime: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '1. How soon after waking do you smoke your first cigarette?',

      },
      options: {
        ca: {
          3: 'Within 5 minutes',
          2: '6-30 minutes',
          1: '31-60 minutes',
          0: 'More than 60 minutes'
        }
      },
      variant: 'radio'
    },
    difficultToRefrainSmoking: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '2. Do you find it difficult to refrain from smoking in places where it is forbidden? e.g., Church, Library, etc.',

      },
      options: yesNoOptions,
      variant: 'radio'
    },
    cigaretteHateToGiveup: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '3. Which cigarette would you hate to give up?',

      },
      options: {
        ca: {
          1: 'The first in the morning',
          0: 'Any other'
        }
      },
      variant: 'radio'
    },
    cigaretteAmount: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '4. How many cigarettes a do you smoke?',

      },
      options: {
        ca: {
          0: '10 or less',
          1: '11 - 20',
          2: '21 - 30',
          3: '31 or more'
        }
      },
      variant: 'radio'
    },
    smokeMoreInMorning: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '5. Do you smoke more frequently in the morning?',

      },
      options: yesNoOptions,
      variant: 'radio'
    },
    smokeWhileSickInBed: {
      disableAutoPrefix: true,
      kind: 'number',
      label: {
        ca: '6. Do you smoke even if you are sick in bed most of the day?',

      },
      options: yesNoOptions,
      variant: 'radio'
    }
  },
  measures: {
    auditCScore: {
      kind: 'computed',
      label: {
        ca: 'Total Score:',

      },
      value: (data) => {
        return sum(Object.values(data));
      }
    }
  },
  validationSchema: z.object({
    smokeTime: z.number().int().min(0).max(3),
    difficultToRefrainSmoking: z.number().int().min(0).max(1),
    cigaretteHateToGiveup: z.number().int().min(0).max(1),
    cigaretteAmount: z.number().int().min(0).max(3),
    smokeMoreInMorning: z.number().int().min(0).max(1),
    smokeWhileSickInBed: z.number().int().min(0).max(1)
  })
});
