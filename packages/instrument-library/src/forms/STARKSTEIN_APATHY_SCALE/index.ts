import { defineInstrument } from '/runtime/v1/@opendatacapture/runtime-core';
import { z } from '/runtime/v1/zod@3.x';

const $FieldOptionsValidation = z.number().int().gte(0).lte(3);
const fieldOptionsLikertScale = {
  ca: {
    0: 'Not at all',
    1: 'Slightly',
    2: 'Some',
    3: 'A lot'
  }
};

export default defineInstrument({
  kind: 'FORM',
  language: ['ca'],
  validationSchema: z.object({
    interestedInLearningNewThings: $FieldOptionsValidation,
    anythingInterestsYou: $FieldOptionsValidation,
    concernedAboutOwnCondition: $FieldOptionsValidation,
    putMuchEffortIntoThings: $FieldOptionsValidation,
    alwaysLookForSomethingToDo: $FieldOptionsValidation,
    havePlanAndGoalsForFuture: $FieldOptionsValidation,
    haveMotivation: $FieldOptionsValidation,
    haveEnergyForDailyActivities: $FieldOptionsValidation,
    needToTellYouWhatToDoEveryday: $FieldOptionsValidation,
    indifferentToThings: $FieldOptionsValidation,
    unconcernedWithManyThings: $FieldOptionsValidation,
    needPushToGetStarted: $FieldOptionsValidation,
    notHappyOrSadJustNeutral: $FieldOptionsValidation,
    areYouApathetic: $FieldOptionsValidation
  }),
  details: {
    description: {
      ca: 'For each question, choose the answer that best describes your thoughts, feelings, and behaviors in the last 4 weeks.'
    },
    license: 'PUBLIC-DOMAIN',
    title: {
      ca: 'Starkstein Apathy Scale'
    },
    referenceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8467636/',
    estimatedDuration: 5,
    instructions: {
      ca: [
        'For each question, choose the answer that best describes your thoughts, feelings, and behaviors in the last 4 weeks.'
      ]
    }
  },
  content: {
    interestedInLearningNewThings: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you interested in learning new things?'
      },
      options: fieldOptionsLikertScale
    },
    anythingInterestsYou: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Does anything interest you?'
      },
      options: fieldOptionsLikertScale
    },
    concernedAboutOwnCondition: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you concerned about your condition?'
      },
      options: fieldOptionsLikertScale
    },
    putMuchEffortIntoThings: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Do you put much effort into things?'
      },
      options: fieldOptionsLikertScale
    },
    alwaysLookForSomethingToDo: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you always looking for something to do?'
      },
      options: fieldOptionsLikertScale
    },
    havePlanAndGoalsForFuture: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Do you have plans and goals for the future?'
      },
      options: fieldOptionsLikertScale
    },
    haveMotivation: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Do you have motivation?'
      },
      options: fieldOptionsLikertScale
    },
    haveEnergyForDailyActivities: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Do you have the energy for daily activities?'
      },
      options: fieldOptionsLikertScale
    },
    needToTellYouWhatToDoEveryday: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Does someone have to tell you what to do each day?'
      },
      options: fieldOptionsLikertScale
    },
    indifferentToThings: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you indifferent to things?'
      },
      options: fieldOptionsLikertScale
    },
    unconcernedWithManyThings: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you unconcerned with many things?'
      },
      options: fieldOptionsLikertScale
    },
    needPushToGetStarted: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Do you need a push to get started on things?'
      },
      options: fieldOptionsLikertScale
    },
    notHappyOrSadJustNeutral: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Are you neither happy nor sad, just in between?'
      },
      options: fieldOptionsLikertScale
    },
    areYouApathetic: {
      kind: 'number',
      variant: 'radio',
      label: {
        ca: 'Would you consider yourself apathetic?'
      },
      options: fieldOptionsLikertScale
    }
  },
  internal: {
    name: 'STARKSTEIN_APATHY_SCALE',
    edition: 1
  },
  measures: {
    interestedInLearningNewThings: {
      kind: 'const',
      ref: 'interestedInLearningNewThings'
    },
    anythingInterestsYou: {
      kind: 'const',
      ref: 'anythingInterestsYou'
    },
    concernedAboutOwnCondition: {
      kind: 'const',
      ref: 'concernedAboutOwnCondition'
    },
    putMuchEffortIntoThings: {
      kind: 'const',
      ref: 'putMuchEffortIntoThings'
    },
    alwaysLookForSomethingToDo: {
      kind: 'const',
      ref: 'alwaysLookForSomethingToDo'
    },
    havePlanAndGoalsForFuture: {
      kind: 'const',
      ref: 'havePlanAndGoalsForFuture'
    },
    haveMotivation: {
      kind: 'const',
      ref: 'haveMotivation'
    },
    haveEnergyForDailyActivities: {
      kind: 'const',
      ref: 'haveEnergyForDailyActivities'
    },
    needToTellYouWhatToDoEveryday: {
      kind: 'const',
      ref: 'needToTellYouWhatToDoEveryday'
    },
    indifferentToThings: {
      kind: 'const',
      ref: 'indifferentToThings'
    },
    unconcernedWithManyThings: {
      kind: 'const',
      ref: 'unconcernedWithManyThings'
    },
    needPushToGetStarted: {
      kind: 'const',
      ref: 'needPushToGetStarted'
    },
    notHappyOrSadJustNeutral: {
      kind: 'const',
      ref: 'notHappyOrSadJustNeutral'
    },
    areYouApathetic: {
      kind: 'const',
      ref: 'areYouApathetic'
    }
  },
  tags: {
    ca: ['Apathy']
  }
});
