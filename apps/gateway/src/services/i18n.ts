import { i18n } from '@douglasneuroinformatics/libui/i18n';

if (!import.meta.env.SSR) {
  i18n.init({
    translations: {}
  });
}
