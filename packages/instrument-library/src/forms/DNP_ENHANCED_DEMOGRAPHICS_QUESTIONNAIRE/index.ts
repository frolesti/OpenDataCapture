import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import type { Language } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

type MultilingualOptions = { [key: string]: { [L in Language]: string } };

type TranslatedOptions<T extends MultilingualOptions> = { [K in keyof T]: string };

type FormattedOptions<T extends MultilingualOptions> = { [L in Language]: { [K in keyof T]: string } };

/**
 * Translates multilingual options to the specified language.
 *
 * @param options - the multilingual options to translate.
 * @param language - the target language.
 * @returns the translated options.
 */
function translateOptions<T extends MultilingualOptions>(options: T, language: Language) {
  const translatedOptions: Partial<TranslatedOptions<T>> = {};
  for (const option in options) {
    translatedOptions[option] = options[option]?.[language];
  }
  return translatedOptions as TranslatedOptions<T>;
}

/**
 * Transform multilingual options to options for a multilingual instrument.
 *
 * @param options - the multilingual options to format.
 * @returns the formatted options.
 */
function formatTranslatedOptions<T extends MultilingualOptions>(options: T) {
  return {
    ca: translateOptions(options, 'ca')
  } satisfies FormattedOptions<T>;
}

/**
 * Extracts keys from an object as a tuple.
 *
 * @param options - The object to extract keys from.
 * @returns the keys as a tuple.
 */
function extractKeysAsTuple<T extends { [key: string]: unknown }>(options: T) {
  return Object.keys(options) as [keyof T, ...(keyof T)[]];
}

const employmentStatus = {
  fullTime: {
    ca: 'Full-Time'
  },
  partTime: {
    ca: 'Part-Time'
  },
  retired: {
    ca: 'Retired'
  },
  student: {
    ca: 'Student'
  },
  unemployed: {
    ca: 'Unemployed'
  }
};

const ethnicOrigin = {
  acadian: {
    ca: 'Acadian'
  },
  afghan: {
    ca: 'Afghan'
  },
  albanian: {
    ca: 'Albanian'
  },
  algerian: {
    ca: 'Algerian'
  },
  american: {
    ca: 'American'
  },
  arab: {
    ca: 'Arab, n.o.s.'
  },
  armenian: {
    ca: 'Armenian'
  },
  australian: {
    ca: 'Australian'
  },
  austrian: {
    ca: 'Austrian'
  },
  bangladeshi: {
    ca: 'Bangladeshi'
  },
  barbadian: {
    ca: 'Barbadian'
  },
  belgian: {
    ca: 'Belgian'
  },
  berber: {
    ca: 'Berber'
  },
  black: {
    ca: 'Black, n.o.s.'
  },
  brazilian: {
    ca: 'Brazilian'
  },
  britishIslesOrigins: {
    ca: 'British Isles origins, n.i.e.'
  },
  bulgarian: {
    ca: 'Bulgarian'
  },
  cambodian: {
    ca: 'Cambodian (Khmer)'
  },
  canadian: {
    ca: 'Canadian'
  },
  caribbeanOrigins: {
    ca: 'Caribbean origins, n.i.e.'
  },
  chilean: {
    ca: 'Chilean'
  },
  chinese: {
    ca: 'Chinese'
  },
  colombian: {
    ca: 'Colombian'
  },
  congolese: {
    ca: 'Congolese'
  },
  croatian: {
    ca: 'Croatian'
  },
  cuban: {
    ca: 'Cuban'
  },
  czech: {
    ca: 'Czech'
  },
  czechoslovakian: {
    ca: 'Czechoslovakian, n.o.s.'
  },
  danish: {
    ca: 'Danish'
  },
  dutch: {
    ca: 'Dutch'
  },
  eastIndian: {
    ca: 'East Indian'
  },
  egyptian: {
    ca: 'Egyptian'
  },
  english: {
    ca: 'English'
  },
  ethiopian: {
    ca: 'Ethiopian'
  },
  filipino: {
    ca: 'Filipino'
  },
  finnish: {
    ca: 'Finnish'
  },
  firstNations: {
    ca: 'First Nations (North American Indian)'
  },
  french: {
    ca: 'French'
  },
  german: {
    ca: 'German'
  },
  ghanaian: {
    ca: 'Ghanaian'
  },
  greek: {
    ca: 'Greek'
  },
  guyanese: {
    ca: 'Guyanese'
  },
  haitian: {
    ca: 'Haitian'
  },
  hungarian: {
    ca: 'Hungarian'
  },
  icelandic: {
    ca: 'Icelandic'
  },
  inuit: {
    ca: 'Inuit'
  },
  iranian: {
    ca: 'Iranian'
  },
  iraqi: {
    ca: 'Iraqi'
  },
  irish: {
    ca: 'Irish'
  },
  israeli: {
    ca: 'Israeli'
  },
  italian: {
    ca: 'Italian'
  },
  jamaican: {
    ca: 'Jamaican'
  },
  japanese: {
    ca: 'Japanese'
  },
  jewish: {
    ca: 'Jewish'
  },
  korean: {
    ca: 'Korean'
  },
  latinCentralAndSouthAmericanOrigins: {
    ca: 'Latin, Central and South American origins, n.i.e.'
  },
  latvian: {
    ca: 'Latvian'
  },
  lebanese: {
    ca: 'Lebanese'
  },
  lithuanian: {
    ca: 'Lithuanian'
  },
  macedonian: {
    ca: 'Macedonian'
  },
  maltese: {
    ca: 'Maltese'
  },
  mexican: {
    ca: 'Mexican'
  },
  mixed: {
    ca: 'Mixed origin'
  },
  moroccan: {
    ca: 'Moroccan'
  },
  métis: {
    ca: 'Métis'
  },
  nigerian: {
    ca: 'Nigerian'
  },
  northernEuropeanOrigins: {
    ca: 'Northern European origins, n.i.e.'
  },
  norwegian: {
    ca: 'Norwegian'
  },
  otherAfricanOrigins: {
    ca: 'Other African origins, n.i.e.'
  },
  otherEuropeanOrigins: {
    ca: 'Other European origins, n.i.e.'
  },
  pakistani: {
    ca: 'Pakistani'
  },
  palestinian: {
    ca: 'Palestinian'
  },
  peruvian: {
    ca: 'Peruvian'
  },
  polish: {
    ca: 'Polish'
  },
  portuguese: {
    ca: 'Portuguese'
  },
  punjabi: {
    ca: 'Punjabi'
  },
  québécois: {
    ca: 'Québécois'
  },
  romanian: {
    ca: 'Romanian'
  },
  russian: {
    ca: 'Russian'
  },
  salvadorean: {
    ca: 'Salvadorean'
  },
  scottish: {
    ca: 'Scottish'
  },
  serbian: {
    ca: 'Serbian'
  },
  slovak: {
    ca: 'Slovak'
  },
  slovenian: {
    ca: 'Slovenian'
  },
  somali: {
    ca: 'Somali'
  },
  southAfrican: {
    ca: 'South African'
  },
  southAsianOrigins: {
    ca: 'South Asian origins, n.i.e.'
  },
  spanish: {
    ca: 'Spanish'
  },
  sriLankan: {
    ca: 'Sri Lankan'
  },
  swedish: {
    ca: 'Swedish'
  },
  swiss: {
    ca: 'Swiss'
  },
  syrian: {
    ca: 'Syrian'
  },
  taiwanese: {
    ca: 'Taiwanese'
  },
  tamil: {
    ca: 'Tamil'
  },
  trinidadianTobagonian: {
    ca: 'Trinidadian/Tobagonian'
  },
  turk: {
    ca: 'Turk'
  },
  ukrainian: {
    ca: 'Ukrainian'
  },
  vietnamese: {
    ca: 'Vietnamese'
  },
  welsh: {
    ca: 'Welsh'
  },
  westIndian: {
    ca: 'West Indian, n.o.s.'
  },
  yugoslavian: {
    ca: 'Yugoslavian, n.o.s.'
  }
};

const firstLanguage = {
  english: {
    ca: 'English'
  },
  french: {
    ca: 'French'
  },
  other: {
    ca: 'Other'
  }
};

const gender = {
  female: {
    ca: 'Woman'
  },
  male: {
    ca: 'Man'
  },
  nonBinary: {
    ca: 'Non-Binary'
  }
};

const maritalStatus = {
  commonLaw: {
    ca: 'Living common law'
  },
  divorced: {
    ca: 'Divorced (not living common law)'
  },
  married: {
    ca: 'Married'
  },
  neverMarried: {
    ca: 'Never married (not living common law)'
  },
  separated: {
    ca: 'Separated (not living common law)'
  },
  widowed: {
    ca: 'Widowed (not living common law)'
  }
};

const religion = {
  agnostic: {
    ca: 'Agnostic'
  },
  buddhist: {
    ca: 'Buddhist'
  },
  christian: {
    ca: 'Christian'
  },
  hindu: {
    ca: 'Hindu'
  },
  indigenous: {
    ca: 'Traditional (North American Indigenous) spirituality'
  },
  jewish: {
    ca: 'Jewish'
  },
  muslim: {
    ca: 'Muslim'
  },
  none: {
    ca: 'No religion and secular perspectives'
  },
  other: {
    ca: 'Other religions and spiritual traditions'
  },
  sikh: {
    ca: 'Sikh'
  }
};

const yesNoOptions = /** @type {const} */ {
  ca: {
    false: 'No',
    true: 'Yes'
  }
};

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    edition: 1,
    name: 'DNP_ENHANCED_DEMOGRAPHICS_QUESTIONNAIRE'
  },
  tags: {
    ca: ['Demographics']
  },
  content: [
    {
      fields: {
        ethnicOrigin: {
          kind: 'string',
          label: {
            ca: 'Ethnic Origin'
          },
          options: formatTranslatedOptions(ethnicOrigin),
          variant: 'select'
        },
        gender: {
          kind: 'string',
          label: {
            ca: 'Gender Identity'
          },
          options: formatTranslatedOptions(gender),
          variant: 'select'
        },
        religion: {
          kind: 'string',
          label: {
            ca: 'Religion'
          },
          options: formatTranslatedOptions(religion),
          variant: 'select'
        }
      },
      title: {
        ca: 'Personal Characteristics'
      }
    },
    {
      fields: {
        firstLanguage: {
          kind: 'string',
          label: {
            ca: 'First Language'
          },
          options: formatTranslatedOptions(firstLanguage),
          variant: 'select'
        },
        speaksEnglish: {
          kind: 'boolean',
          label: {
            ca: 'Speak and Understand English'
          },
          options: yesNoOptions,
          variant: 'radio'
        },
        speaksFrench: {
          kind: 'boolean',
          label: {
            ca: 'Speak and Understand French'
          },
          options: yesNoOptions,
          variant: 'radio'
        }
      },
      title: {
        ca: 'Language'
      }
    },
    {
      fields: {
        householdSize: {
          kind: 'number',
          label: {
            ca: 'Household Size'
          },
          max: 20,
          min: 0,
          variant: 'input'
        },
        maritalStatus: {
          kind: 'string',
          label: {
            ca: 'Martial Status'
          },
          options: formatTranslatedOptions(maritalStatus),
          variant: 'select'
        },
        numberChildren: {
          kind: 'number',
          label: {
            ca: 'Number of Children'
          },
          max: 20,
          min: 0,
          variant: 'input'
        },
        postalCode: {
          kind: 'string',
          label: {
            ca: 'Postal Code'
          },
          variant: 'input'
        }
      },
      title: {
        ca: 'Living Situation'
      }
    },
    {
      fields: {
        annualIncome: {
          kind: 'number',
          label: {
            ca: 'Annual Income'
          },
          max: 1000000,
          min: 0,
          variant: 'input'
        },
        employmentStatus: {
          kind: 'string',
          label: {
            ca: 'Employment Status'
          },
          options: formatTranslatedOptions(employmentStatus),
          variant: 'select'
        }
      },
      title: {
        ca: 'Economic Situation'
      }
    },
    {
      fields: {
        yearsOfEducation: {
          kind: 'number',
          label: {
            ca: 'Years of Education'
          },
          max: 30,
          min: 0,
          variant: 'input'
        }
      },
      title: {
        ca: 'Education'
      }
    },
    {
      fields: {
        ageAtImmigration: {
          kind: 'number',
          label: {
            ca: 'Age at Immigration'
          },
          max: 100,
          min: 1,
          variant: 'input'
        },
        isCanadianCitizen: {
          kind: 'boolean',
          label: {
            ca: 'Canadian Citizen'
          },
          options: yesNoOptions,
          variant: 'radio'
        }
      },
      title: {
        ca: 'Immigration'
      }
    }
  ],
  clientDetails: {
    estimatedDuration: 5,
    instructions: {
      ca: [
        'Please provide the most accurate answer for the following questions. If there are more than one correct answers, select the one that is more applicable.'
      ]
    }
  },
  details: {
    description: {
      ca: 'This instrument is designed to capture more specific demographic data, beyond that which is required for initial subject registration. All questions are optional.'
    },

    license: 'Apache-2.0',
    title: {
      ca: 'Enhanced Demographics Questionnaire'
    }
  },
  measures: {},
  validationSchema: z
    .object({
      ageAtImmigration: z.number().int().gte(1).lte(100),
      annualIncome: z.number().int().gte(0).lte(1000000),
      employmentStatus: z.enum(extractKeysAsTuple(employmentStatus)),
      ethnicOrigin: z.enum(extractKeysAsTuple(ethnicOrigin)),
      firstLanguage: z.enum(extractKeysAsTuple(firstLanguage)),
      gender: z.enum(extractKeysAsTuple(gender)),
      householdSize: z.number().int().gte(0).lte(20),
      isCanadianCitizen: z.boolean(),
      maritalStatus: z.enum(extractKeysAsTuple(maritalStatus)),
      numberChildren: z.number().int().gte(0).lte(20),
      postalCode: z.string().regex(new RegExp('^[A-Z]\\d[A-Z][ -]?\\d[A-Z]\\d$')),
      religion: z.enum(extractKeysAsTuple(religion)),
      speaksEnglish: z.boolean(),
      speaksFrench: z.boolean(),
      yearsOfEducation: z.number().int().gte(0).lte(30)
    })
    .partial()
});
