import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { sum } from '/runtime/v1/lodash-es@4.x';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    name: 'AUDIT_C',
    edition: 1
  },
  tags: {
    ca: ['Alcohol', 'Health', 'Disorder']
  },
  clientDetails: {
    title: {
      ca: 'Alcohol Use (AUDIT-C)'
    }
  },
  details: {
    description: {
      ca: 'The Alcohol Use Disorders Identification Test (AUDIT-C) is an alcohol screen that can help identify patients who are hazardous drinkers or have active alcohol use disorders (including alcohol abuse or dependence).'
    },
    estimatedDuration: 2,
    instructions: {
      ca: ['Please respond to every question']
    },
    license: 'PUBLIC-DOMAIN',
    title: {
      ca: 'Alcohol Use Disorders Identification Test (AUDIT-C)'
    }
  },
  content: {
    drinkingFrequency: {
      kind: 'number',
      label: {
        ca: '1. How often do you have a drink containing alcohol?'
      },
      options: {
        ca: {
          0: 'Never',
          1: 'Monthly or Less',
          2: '2 to 4 times a month',
          3: '2 to 3 times a week',
          4: '4 or more times a week'
        }
      },
      variant: 'radio'
    },
    typicalDrinkQuantity: {
      kind: 'number',
      label: {
        ca: '2. How many drinks containing alcohol do you have on a typical day when you are drinking?'
      },
      options: {
        ca: {
          0: '1 or 2',
          1: '3 or 4',
          2: '5 or 6',
          3: '7 to 9',
          4: '10 or more'
        }
      },
      variant: 'radio'
    },
    bingeDrinkingFrequency: {
      kind: 'number',
      label: {
        ca: '3. How often do you have six or more drinks on one occasion?'
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
    }
  },
  measures: {
    auditCScore: {
      kind: 'computed',
      label: {
        ca: 'Total Score'
      },
      value: (data) => {
        return sum(Object.values(data));
      }
    }
  },
  validationSchema: z.object({
    drinkingFrequency: z.number().int().min(0).max(4),
    typicalDrinkQuantity: z.number().int().min(0).max(4),
    bingeDrinkingFrequency: z.number().int().min(0).max(4)
  })
});
