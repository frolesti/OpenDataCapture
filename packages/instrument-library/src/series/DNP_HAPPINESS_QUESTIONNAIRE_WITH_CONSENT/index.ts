import type { SeriesInstrument } from '/runtime/v1/@opendatacapture/runtime-core';

const instrument: SeriesInstrument = {
  __runtimeVersion: 1,
  kind: 'SERIES',
  language: ['ca'],
  tags: {
    ca: ['Well-Being'],

  },
  clientDetails: {
    instructions: {
      ca: [
        'This instrument consists of two parts: a general consent form and a questionnaire to assess your happiness. Please complete both in a timely manner.'
      ]
    }
  },
  details: {
    description: {
      ca: 'The Happiness Questionnaire is a questionnaire about happiness.',

    },
    license: 'Apache-2.0',
    title: {
      ca: 'Happiness Questionnaire (With General Consent)',

    }
  },
  content: [
    {
      name: 'DNP_GENERAL_CONSENT_FORM',
      edition: 1
    },
    {
      name: 'DNP_HAPPINESS_QUESTIONNAIRE',
      edition: 1
    }
  ]
};

export default instrument;
