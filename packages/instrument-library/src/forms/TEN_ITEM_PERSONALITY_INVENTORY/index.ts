import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const $IntScale = z.number().int().min(1).max(7);
const $ContinuousScale = z.number().min(1).max(7);

const scaleOptions = {
  ca: {
    1: 'Disagree strongly',
    2: 'Disagree moderately',
    3: 'Disagree a little',
    4: 'Neither agree or disagree',
    5: 'Agree a little',
    6: 'Agree moderately',
    7: 'Agree strongly'
  }
};

/** compute reverse score, i.e. 1 become 7, 2 becomes 6, etc. */
function reverseScore(score: number): number {
  return 8 - score;
}

/** compute final score by doing ((reverseScore(a) + b) / 2)  */
const computeScore = (a: number, b: number) => (((reverseScore(a) + b) / 2) * 100) / 100;

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    name: 'TEN_ITEM_PERSONALITY_INVENTORY',
    edition: 1
  },
  tags: {
    ca: [
      'personality',
      'traits',
      'extraversion',
      'agreeableness',
      'conscientiousness',
      'emotional',
      'stability',
      'openness'
    ],

  },
  details: {
    description: {
      ca: 'The Ten-Item Personality Inventory (TIPI) is a brief instrument designed to assess the five-factor model (FFM) personality dimensions. It was specifically developed to provide a brief assessment option in situations where using more comprehensive FFM instruments would be unfeasible.',

    },
    estimatedDuration: 5,
    instructions: {
      ca: ['Please respond to every question'],

    },
    license: 'FREE-NOS',
    title: {
      ca: 'Ten-Item Personality Inventory (TIPI)',

    }
  },
  content: [
    {
      description: {
        ca: 'Here are a number of personality traits that may or may not apply to you. Please select a number next to each statement to indicate the extent to which you agree or disagree with that statement. You should rate the extent to which the pair of traits applies to you, even if one characteristic applies more strongly than the other.',

      },
      fields: {
        extrovertedEnthusiastic: {
          kind: 'number',
          label: {
            ca: '1. Extroverted, enthusiastic.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        criticalQuarrelsome: {
          kind: 'number',
          label: {
            ca: '2. Critical, quarrelsome.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        dependableSelfDisciplined: {
          kind: 'number',
          label: {
            ca: '3. Dependable, self-disciplined.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        anxiousEasilyUpset: {
          kind: 'number',
          label: {
            ca: '4. Anxious, easily upset.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        newExperiencesComplex: {
          kind: 'number',
          label: {
            ca: '5. Open to new experiences, complex.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        reservedQuiet: {
          kind: 'number',
          label: {
            ca: '6. Reserved, quiet.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        sympatheticWarm: {
          kind: 'number',
          label: {
            ca: '7. Sympathetic, warm.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        disorganizedCareless: {
          kind: 'number',
          label: {
            ca: '8. Disorganized, careless.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        calmEmotionallyStable: {
          kind: 'number',
          label: {
            ca: '9. Calm, emotionally stable.',

          },
          options: scaleOptions,
          variant: 'select'
        },
        conventionalUncreative: {
          kind: 'number',
          label: {
            ca: '10. Conventional, uncreative.',

          },
          options: scaleOptions,
          variant: 'select'
        }
      }
    }
  ],
  measures: {
    extraversion: {
      kind: 'computed',
      label: {
        ca: 'Extraversion (higher score = more extroverted, range 1-7)',

      },
      value: (data) => {
        // calculate the score = (reverse(q6) + q1) / 2
        const score1 = data.extrovertedEnthusiastic;
        const score6 = data.reservedQuiet;
        return computeScore(score6, score1);
      }
    },
    agreeableness: {
      kind: 'computed',
      label: {
        ca: 'Agreeableness (higher score = more agreeable, range 1-7)',

      },
      value: (data) => {
        // calculate the score = (reverse(q2) + q7) / 2
        const score2 = data.criticalQuarrelsome;
        const score7 = data.sympatheticWarm;
        return computeScore(score2, score7);
      }
    },
    conscientiousness: {
      kind: 'computed',
      label: {
        ca: 'Conscientiousness (higher score = more conscientious, range 1-7)',

      },
      value: (data) => {
        // calculate the score = (reverse(q8) + q3) / 2
        const score3 = data.dependableSelfDisciplined;
        const score8 = data.disorganizedCareless;
        return computeScore(score8, score3);
      }
    },
    emotionalStability: {
      kind: 'computed',
      label: {
        ca: 'Emotional Stability (higher score = more stable, range 1-7)',

      },
      value: (data) => {
        // calculate the score = (reverse(q4) + q9) / 2
        const score4 = data.anxiousEasilyUpset;
        const score9 = data.calmEmotionallyStable;
        return computeScore(score4, score9);
      }
    },
    openessToExperience: {
      kind: 'computed',
      label: {
        ca: 'Openness to Experience (higher score = more open, range 1-7)',

      },
      value: (data) => {
        // calculate the score = (reverse(q10) + q5) / 2
        const score5 = data.newExperiencesComplex;
        const score10 = data.conventionalUncreative;
        return computeScore(score10, score5);
      }
    }
  },
  validationSchema: z.object({
    //answers
    extrovertedEnthusiastic: $IntScale,
    criticalQuarrelsome: $IntScale,
    dependableSelfDisciplined: $IntScale,
    anxiousEasilyUpset: $IntScale,
    newExperiencesComplex: $IntScale,
    reservedQuiet: $IntScale,
    sympatheticWarm: $IntScale,
    disorganizedCareless: $IntScale,
    calmEmotionallyStable: $IntScale,
    conventionalUncreative: $IntScale,
    //measures
    extraversion: $ContinuousScale.optional(),
    agreeableness: $ContinuousScale.optional(),
    conscientiousness: $ContinuousScale.optional(),
    emotionalStability: $ContinuousScale.optional(),
    opennessToExperience: $ContinuousScale.optional()
  })
});
