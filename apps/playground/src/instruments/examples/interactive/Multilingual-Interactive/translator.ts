import { Translator } from '/runtime/v1/@opendatacapture/runtime-core';

export const translator = new Translator({
  translations: {
    changeLanguage: {
      en: 'Change Language'
    },
    greetings: {
      hello: {
        en: 'Hello'
      }
    },
    submit: {
      en: 'Submit'
    }
  }
});
