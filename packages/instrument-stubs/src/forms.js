/* eslint-disable perfectionist/sort-objects */

import { createInstrumentStub } from './utils.js';

/**
 * @typedef {import('@opendatacapture/runtime-core').Language} Language
 * @typedef {{ favoriteNumber: number, reasonFavoriteNumberIsNegative?: string; }} FormInstrumentStubData
 */

/** @type {import('./utils.js').InstrumentStub<import('@opendatacapture/runtime-core').FormInstrument<FormInstrumentStubData, Language>>} */
export const unilingualFormInstrument = await createInstrumentStub(async () => {
  const { z } = await import('zod/v3');
  return {
    __runtimeVersion: 1,
    content: {
      favoriteNumber: {
        kind: 'number',
        label: 'Favorite Number',
        variant: 'input'
      },
      reasonFavoriteNumberIsNegative: {
        deps: ['favoriteNumber'],
        kind: 'dynamic',
        render(data) {
          if (!data?.favoriteNumber || data.favoriteNumber >= 0) {
            return null;
          }
          return {
            kind: 'string',
            label: 'Why is Your Favorite Number Negative?',
            variant: 'textarea'
          };
        }
      }
    },
    clientDetails: {
      title: 'Unilingual Form (Client Title)'
    },
    details: {
      authors: ['Jane Doe', 'John Smith'],
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      estimatedDuration: 1,
      instructions: ['Please complete all questions'],
      license: 'Apache-2.0',
      sourceUrl: 'https://github.com',
      title: 'Unilingual Form'
    },
    measures: {
      favoriteNumber: {
        kind: 'const',
        ref: 'favoriteNumber'
      },
      hasNegativeFavoriteNumber: {
        kind: 'computed',
        label: 'Has Negative Favorite Number',
        value: (data) => 0 > data.favoriteNumber
      }
    },
    kind: 'FORM',
    language: 'ca',

    tags: ['Example', 'Preferences'],
    validationSchema: z.object({
      favoriteNumber: z.number(),
      reasonFavoriteNumberIsNegative: z.string().optional()
    }),
    internal: {
      edition: 1,
      name: 'UNILINGUAL_FORM'
    }
  };
});

/** @type {import('./utils.js').InstrumentStub<import('@opendatacapture/runtime-core').FormInstrument<FormInstrumentStubData, Language[]>>} */
export const bilingualFormInstrument = await createInstrumentStub(async () => {
  const { z } = await import('zod/v4');
  return {
    __runtimeVersion: 1,
    content: {
      favoriteNumber: {
        kind: 'number',
        label: {
          ca: 'Número favorit',
          en: 'Favorite Number',
          es: 'Número favorito',
          fr: 'Numéro favori'
        },
        variant: 'input'
      },
      reasonFavoriteNumberIsNegative: {
        deps: ['favoriteNumber'],
        kind: 'dynamic',
        render(data) {
          if (!data?.favoriteNumber || data.favoriteNumber >= 0) {
            return null;
          }
          return {
            kind: 'string',
            label: {
              ca: 'Per què el teu número favorit és negatiu?',
              en: 'Why is your favorite number negative?',
              es: '¿Por qué tu número favorito es negativo?',
              fr: 'Pourquoi votre numéro favori est-il négatif?'
            },
            variant: 'textarea'
          };
        }
      }
    },
    details: {
      description: {
        ca: 'Aquest és un instrument de formulari bilingüe',
        en: 'This is a bilingual form instrument',
        es: 'Este es un instrumento de formulario bilingüe',
        fr: 'Ceci est un instrument de formulaire bilingue'
      },
      estimatedDuration: 1,
      instructions: {
        ca: ['Si us plau, completeu totes les preguntes'],
        en: ['Please complete all questions'],
        es: ['Por favor, complete todas las preguntas'],
        fr: ['Veuillez répondre à toutes les questions']
      },
      license: 'Apache-2.0',
      title: {
        ca: 'Formulari bilingüe',
        en: 'Bilingual Form',
        es: 'Formulario bilingüe',
        fr: 'Formulaire bilingue'
      }
    },
    kind: 'FORM',
    language: ['ca', 'en', 'es', 'fr'],

    tags: {
      ca: ['Exemple', 'Preferències'],
      en: ['Example', 'Preferences'],
      es: ['Ejemplo', 'Preferencias'],
      fr: ['Exemple', 'Préférences']
    },
    measures: {},
    validationSchema: z.object({
      favoriteNumber: z.number(),
      reasonFavoriteNumberIsNegative: z.string().optional()
    }),
    internal: {
      name: 'BILINGUAL_FORM',
      edition: 1
    }
  };
});
