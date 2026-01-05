import React from 'react';
import ReactDOM from 'react-dom/client';

import { i18n } from '@douglasneuroinformatics/libui/i18n';

import { App } from './App';
import libui from './translations/libui.json';

import '@opendatacapture/react-core/globals.css';

declare module '@douglasneuroinformatics/libui/i18n' {
  export namespace UserConfig {
    export interface LanguageOptions {
      ca: true;
      es: true;
    }
    export interface Translations {
      libui: typeof libui;
    }
  }
}

const root = document.getElementById('root')!;

i18n.init({
  defaultLanguage: 'ca',
  translations: {
    libui
  }
});

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
