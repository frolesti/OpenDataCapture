/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    edition: 1,
    name: 'HAPPINESS_QUESTIONNAIRE'
  },
  tags: {
    ca: ['Well-Being']
  },
  content: [
    {
      title: {
        ca: 'Personal Information'
      },
      description: {
        ca: 'Please provide the following information for our records'
      },
      fields: {
        firstName: {
          kind: 'string',
          label: {
            ca: 'First Name'
          },
          variant: 'input'
        },
        lastName: {
          kind: 'string',
          label: {
            ca: 'Last Name'
          },
          variant: 'input'
        },
        dateOfBirth: {
          kind: 'date',
          label: {
            ca: 'Date of Birth'
          }
        }
      }
    },
    {
      title: {
        ca: 'Questions Regarding Life'
      },
      fields: {
        overallHappiness: {
          description: {
            ca: 'Overall happiness from 1 through 10 (inclusive)'
          },
          kind: 'number',
          label: {
            ca: 'Overall Happiness'
          },
          max: 10,
          min: 1,
          variant: 'slider'
        },
        reasonForSadness: {
          deps: ['overallHappiness'],
          kind: 'dynamic',
          render: (data) => {
            if (!data?.overallHappiness || data.overallHappiness >= 5) {
              return null;
            }
            return {
              label: {
                ca: 'Reason for Sadness'
              },
              isRequired: false,
              kind: 'string',
              variant: 'textarea'
            };
          }
        }
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: ['Please respond to all questions']
    }
  },
  details: {
    description: {
      ca: 'This is an example of a multilingual grouped form'
    },
    license: 'Apache-2.0',
    title: {
      ca: 'Happiness Questionnaire'
    }
  },
  measures: {
    overallHappiness: {
      kind: 'const',
      ref: 'overallHappiness'
    }
  },
  validationSchema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.date(),
    overallHappiness: z.number().int().gte(1).lte(10),
    reasonForSadness: z.string().optional()
  })
});
