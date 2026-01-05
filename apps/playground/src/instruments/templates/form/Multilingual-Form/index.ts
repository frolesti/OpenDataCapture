/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],

  tags: {
    ca: ['<PLACEHOLDER>']
  },
  internal: {
    edition: 1,
    name: '<PLACEHOLDER>'
  },
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: ['<PLACEHOLDER>']
    }
  },
  content: {},
  details: {
    description: {
      en: '<PLACEHOLDER>'
    },
    license: 'Apache-2.0',
    title: {
      en: '<PLACEHOLDER>'
    }
  },
  measures: {},
  validationSchema: z.object({})
});
