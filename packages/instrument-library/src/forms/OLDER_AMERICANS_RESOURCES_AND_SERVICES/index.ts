import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  internal: {
    name: 'OLDER_AMERICANS_RESOURCES_AND_SERVICES',
    edition: 1
  },
  tags: {
    ca: ['social']
  },
  content: {
    peopleYouKnowCanVisitTheirHome: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'How many people do you know well enough to visit within their homes?'
      },
      options: {
        ca: {
          'five or more': 'five or more',
          'three to four': 'three to four',
          'one to two': 'one to two',
          none: 'none',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    numbersOfCallsLastWeek: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'About how many times did you talk to someone (friends, relatives, or others) on the telephone in the past week? (either you called them or they called you) If you do not have a phone, the question still applies.'
      },
      options: {
        ca: {
          'once a day or more': 'once a day or more',
          '2 - 6 times': '2 - 6 times',
          once: 'once',
          'not at all': 'not at all',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    numbersOfTimeSpentWithSomeoneLastWeek: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'How many times during the past week did you spend some time with someone who does not live with you, that is you went to see them or they came to visit you or you went out to do things together?'
      },
      options: {
        ca: {
          'once a day or more': 'once a day or more',
          '2 - 6 times': '2 - 6 times',
          once: 'once',
          'not at all': 'not at all',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    haveSomeoneYouTrust: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'Do you have someone you trust and can confide in?'
      },
      options: {
        ca: {
          yes: 'yes',
          no: 'no',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    doYouFeelLonely: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'Do you find yourself feeling lonely quite often, sometimes or almost never?'
      },
      options: {
        ca: {
          'quite often': 'quite often',
          sometimes: 'sometimes',
          'almost never': 'almost never',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    seeFriendsAndRelativesAsYouWant: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'Do you see your relatives and friends as often as you want to or are you somewhat unhappy about how little you see them?'
      },
      options: {
        ca: {
          'as often as wants to': 'as often as wants to',
          'somewhat unhappy about how little': 'somewhat unhappy about how little',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    someoneTakeCareOfYouWhenNeeded: {
      kind: 'string',
      variant: 'radio',
      label: {
        ca: 'Do you have someone you trust and can confide in?'
      },
      options: {
        ca: {
          yes: 'yes',
          'no one willing and able': 'no one willing and able',
          'prefer not to answer': 'prefer not to answer'
        }
      }
    },
    someoneTakeCareOfYouAsLongAsYouNeed: {
      kind: 'dynamic',
      deps: ['someoneTakeCareOfYouWhenNeeded'],
      render: (data) => {
        return data?.someoneTakeCareOfYouWhenNeeded === 'yes'
          ? {
              kind: 'string',
              variant: 'radio',
              label: {
                ca: 'Is there someone who would take care of you as long as you needed, or only for a short time, or only someone who would help you now and then (for example, taking you to the doctor or fixing lunch occasionally, etc.)?'
              },
              options: {
                ca: {
                  'Someone who would take care of you indefinitely (as long as needed)':
                    'Someone who would take care of you indefinitely (as long as needed)',
                  'Someone who would take care of you for a short time (a few weeks to six months)':
                    'Someone who would take care of you for a short time (a few weeks to six months)',
                  'Someone who would help you now and then (taking you to the doctor, fixing lunch, etc.)':
                    'Someone who would help you now and then (taking you to the doctor, fixing lunch, etc.)',
                  'prefer not to answer': 'prefer not to answer'
                }
              }
            }
          : null;
      }
    }
  },
  details: {
    description: {
      ca: 'Social Support: Now, we will ask you some questions about your family and friends. Reference: https://osf.io/94qv5/'
    },
    estimatedDuration: 3,
    instructions: {
      ca: ['Now, I would like to ask you some questions about your family and friends. Please complete all questions.']
    },
    license: 'CC-BY-4.0',
    title: {
      ca: 'Older Americans Resources and Services Social Resource Scale'
    }
  },
  validationSchema: z.object({
    peopleYouKnowCanVisitTheirHome: z.enum([
      'five or more',
      'three to four',
      'one to two',
      'none',
      'prefer not to answer'
    ]),
    numbersOfCallsLastWeek: z.enum(['once a day or more', '2 - 6 times', 'once', 'not at all', 'prefer not to answer']),
    numbersOfTimeSpentWithSomeoneLastWeek: z.enum([
      'once a day or more',
      '2 - 6 times',
      'once',
      'not at all',
      'prefer not to answer'
    ]),
    haveSomeoneYouTrust: z.enum(['yes', 'no', 'prefer not to answer']),
    doYouFeelLonely: z.enum(['quite often', 'sometimes', 'almost never', 'prefer not to answer']),
    seeFriendsAndRelativesAsYouWant: z.enum([
      'as often as wants to',
      'somewhat unhappy about how little',
      'prefer not to answer'
    ]),
    someoneTakeCareOfYouWhenNeeded: z.enum(['yes', 'no one willing and able', 'prefer not to answer']),
    someoneTakeCareOfYouAsLongAsYouNeed: z
      .enum([
        'Someone who would take care of you indefinitely (as long as needed)',
        'Someone who would take care of you for a short time (a few weeks to six months)',
        'Someone who would help you now and then (taking you to the doctor, fixing lunch, etc.)',
        'prefer not to answer'
      ])
      .optional()
  }),
  measures: {
    peopleYouKnowCanVisitTheirHome: {
      kind: 'const',
      ref: 'peopleYouKnowCanVisitTheirHome'
    },
    numbersOfCallsLastWeek: {
      kind: 'const',
      ref: 'numbersOfCallsLastWeek'
    },
    numbersOfTimeSpentWithSomeoneLastWeek: {
      kind: 'const',
      ref: 'numbersOfTimeSpentWithSomeoneLastWeek'
    },
    haveSomeoneYouTrust: {
      kind: 'const',
      ref: 'haveSomeoneYouTrust'
    },
    doYouFeelLonely: {
      kind: 'const',
      ref: 'doYouFeelLonely'
    },
    seeFriendsAndRelativesAsYouWant: {
      kind: 'const',
      ref: 'seeFriendsAndRelativesAsYouWant'
    },
    someoneTakeCareOfYouWhenNeeded: {
      kind: 'const',
      ref: 'someoneTakeCareOfYouWhenNeeded'
    },
    someoneTakeCareOfYouAsLongAsYouNeed: {
      kind: 'computed',
      label: {
        ca: 'Is there someone who would take care of you as long as you needed, or only for a short time, or only someone who would help you now and then (for example, taking you to the doctor or fixing lunch occasionally, etc.)?'
      },
      value: (data) => {
        return data.someoneTakeCareOfYouAsLongAsYouNeed ?? 'N/A';
      }
    }
  }
});
