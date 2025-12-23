/* eslint-disable perfectionist/sort-objects */

import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

import { translator } from './translator.ts';

export default defineInstrument({
  kind: 'INTERACTIVE',
  language: ['en', 'fr'],
  tags: {
    en: ['<PLACEHOLDER>'],
    fr: ['<PLACEHOLDER>']
  },
  internal: {
    edition: 1,
    name: '<PLACEHOLDER>'
  },
  content: {
    render(done) {
      translator.init();

      const changeLanguageButton = document.createElement('button');
      changeLanguageButton.textContent = translator.t('changeLanguage' as any);
      document.body.appendChild(changeLanguageButton);

      changeLanguageButton.addEventListener('click', () => {
        translator.changeLanguage(translator.resolvedLanguage === 'en' ? 'fr' : 'en');
      });

      const submitButton = document.createElement('button');
      submitButton.textContent = translator.t('submit' as any);
      document.body.appendChild(submitButton);

      translator.onLanguageChange = () => {
        changeLanguageButton.textContent = translator.t('changeLanguage' as any);
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
      en: ['<PLACEHOLDER>'],
      fr: ['<PLACEHOLDER>']
    }
  },
  details: {
    description: {
      en: '<PLACEHOLDER>',
      fr: '<PLACEHOLDER>'
    },
    license: 'Apache-2.0',
    title: {
      en: '<PLACEHOLDER>',
      fr: '<PLACEHOLDER>'
    }
  },
  measures: {},
  validationSchema: z.object({
    message: z.string()
  })
});
