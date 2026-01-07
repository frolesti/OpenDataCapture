import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { i18n } from '@douglasneuroinformatics/libui/i18n';
import axios, { isAxiosError } from 'axios';

import { config } from '@/config';
import { useAppStore } from '@/store';

axios.defaults.baseURL = import.meta.env.MODE !== 'test' ? config.setup.apiBaseUrl : undefined;

axios.interceptors.request.use((config) => {
  const accessToken = useAppStore.getState().accessToken;

  config.headers.setAccept('application/json');

  // Do not set timeout for setup (can be CPU intensive, especially on slow server)
  if (
    config.url !== '/v1/setup' &&
    config.url !== '/v1/instrument-records/upload' &&
    config.url !== '/v1/instrument-records/export'
  ) {
    config.timeout = 10000; // abort request after 10 seconds
    config.timeoutErrorMessage = i18n.t({
      en: 'Error de xarxa'
    });
  }

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

axios.interceptors.response.use(
  (response) => {
    if (!import.meta.env.DEV) {
      return response;
    }
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve(response);
      }, config.dev.networkLatency)
    );
  },
  (error) => {
    const notifications = useNotificationsStore.getState();
    if (isAxiosError(error) && error.response?.status === 401) {
      useAppStore.getState().logout();
      return Promise.reject(error);
    }
    if (!isAxiosError(error)) {
      notifications.addNotification({
        message: i18n.t({
          en: 'Error desconegut'
        }),
        type: 'error'
      });
      console.error(error);
      return Promise.reject(error as Error);
    }
    notifications.addNotification({
      message: i18n.t({
        en: 'Sol·licitud HTTP fallida'
      }),
      title: error.response?.status.toString(),
      type: 'error'
    });
    return Promise.reject(error);
  }
);
