/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    edition: 1,
    name: 'FAVORITE_COLOR'
  },
  tags: {
    ca: ['Dynamic']
  },
  content: {
    hasFavoriteColor: {
      kind: 'boolean',
      label: {
        en: 'Do you have a favorite color?'
      },
      variant: 'radio'
    },
    favoriteColor: {
      kind: 'dynamic',
      deps: ['hasFavoriteColor'],
      render(data) {
        if (!data?.hasFavoriteColor) {
          return null;
        }
        return {
          kind: 'string',
          label: {
            en: 'Favorite Color'
          },
          options: {
            ca: {
              red: 'Red',
              green: 'Green',
              blue: 'Blue'
            }
          },
          variant: 'select'
        };
      }
    }
  },
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: ['Please respond to all questions']
    }
  },
  details: {
    description: {
      en: 'This is an example of a simple form with conditional rendering and validation logic'
    },
    license: 'Apache-2.0',
    title: {
      en: 'Favorite Color'
    }
  },
  measures: {},
  validationSchema: z
    .object({
      hasFavoriteColor: z.boolean({ message: 'This field is required' }),
      favoriteColor: z.enum(['red', 'blue', 'green']).optional()
    })
    .superRefine((data, ctx) => {
      if (data.hasFavoriteColor && !data.favoriteColor) {
        ctx.addIssue({
          code: 'custom',
          path: ['favoriteColor'],
          message: 'This field is required'
        });
      }
    })
});
