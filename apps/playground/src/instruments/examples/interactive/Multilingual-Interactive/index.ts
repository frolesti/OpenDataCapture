/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

import { translator } from './translator.ts';

export default defineInstrument({
  kind: 'INTERACTIVE',
  language: ['ca'],
  tags: {
    ca: ['<PLACEHOLDER>'],

  },
  internal: {
    edition: 1,
    name: '<PLACEHOLDER>'
  },
  content: {
    render(done) {
      translator.init();

      // Language toggle removed as we only support Catalan
      // const changeLanguageButton = document.createElement('button');
      // changeLanguageButton.textContent = translator.t('changeLanguage' as any);
      // document.body.appendChild(changeLanguageButton);

      // changeLanguageButton.addEventListener('click', () => {
      //   translator.changeLanguage(translator.resolvedLanguage === 'en' ? 'fr' : 'en');
      // });

      const submitButton = document.createElement('button');
      submitButton.textContent = translator.t('submit' as any);
      document.body.appendChild(submitButton);

      translator.onLanguageChange = () => {
        // changeLanguageButton.textContent = translator.t('changeLanguage' as any);
        submitButton.textContent = translator.t('submit' as any);
      };

      submitButton.addEventListener('click', () => {
        done({ message: translator.t('greetings.hello' as any) });
      });
    }
  },
  clientDetails: {
    estimatedDuration: 1,
    instructions: {
      ca: ['<PLACEHOLDER>'],

    }
  },
  details: {
    description: {
      ca: '<PLACEHOLDER>',

    },
    license: 'Apache-2.0',
    title: {
      ca: '<PLACEHOLDER>',

    }
  },
  measures: {},
  validationSchema: z.object({
    message: z.string()
  })
});
