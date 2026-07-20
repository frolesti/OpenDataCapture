import { z as z3 } from 'zod';
import { z as z4 } from 'zod/v4';

import i18n from './i18n';

const getLocalizedValidationMessage = (_defaultMessage: string, issue: any) => {
  const isUndefined = issue.code === 'invalid_type' && issue.received === 'undefined';
  const isEmptyString = issue.code === 'too_small' && issue.minimum === 1 && issue.type === 'string';

  if (isUndefined || isEmptyString) {
    return i18n.t('core.form.requiredField');
  }

  if (issue.code === 'invalid_type') {
    return i18n.t({
      en: 'Tipus de valor no vàlid',
      fr: 'Tipo de valor no válido'
    });
  }

  return i18n.t({
    en: 'Valor no vàlid',
    fr: 'Valor no válido'
  });
};

z3.setErrorMap((issue, ctx) => {
  return { message: getLocalizedValidationMessage(ctx.defaultError, issue) };
});

z4.setErrorMap(((issue: any, ctx: any) => {
  return { message: getLocalizedValidationMessage(ctx?.defaultError ?? '', issue) };
}) as any);
