import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  tags: {
    ca: ['Consent']
  },
  internal: {
    edition: 1,
    name: 'DNP_GENERAL_CONSENT_FORM'
  },
  content: [
    {
      title: {
        ca: 'Terms and Conditions'
      },
      description: {
        ca: 'You agree that all data you enter into our system will become the property of the Douglas Neuroinformatics Platform. You grant us full ownership of this data, allowing us to use, analyze, distribute, and share it for any purpose, including but not limited to research and performance improvement.'
      },
      fields: {
        consent: {
          kind: 'boolean',
          label: {
            ca: 'I have read, understand, and agree to the above terms'
          },
          variant: 'checkbox'
        }
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 1
  },
  details: {
    description: {
      ca: 'The general consent form asks participants if they consent to their data being used for any purpose. This is intended for demo purposes and is not recommended for real-world research projects.'
    },
    license: 'Apache-2.0',
    title: {
      ca: 'General Consent Form'
    }
  },
  measures: null,
  validationSchema: z.object({
    consent: z.literal(true, { message: 'You must agree to the terms to continue' })
  })
});
