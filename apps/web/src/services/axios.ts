import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { i18n } from '@douglasneuroinformatics/libui/i18n';
import axios, { isAxiosError } from 'axios';

import { config } from '@/config';
import { useAppStore } from '@/store';

declare module 'axios' {
  interface AxiosRequestConfig {
    suppressErrorNotification?: boolean;
  }
}

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
      en: 'Error de xarxa',
      fr: 'Error de red'
    });
  }

  const isPublicSetupRequest = config.url === '/v1/setup' && (config.method === 'get' || config.method === 'post');
  if (config.url === '/v1/auth/login' || isPublicSetupRequest) {
    config.headers.delete('Authorization');
  } else if (accessToken) {
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

    const extractErrorMessage = (value: unknown) => {
      if (!value || typeof value !== 'object') {
        return null;
      }

      const message = Reflect.get(value, 'message');
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }

      if (Array.isArray(message)) {
        const firstMessage = message.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        return typeof firstMessage === 'string' ? firstMessage : null;
      }

      return null;
    };

    if (isAxiosError(error) && error.response?.status === 401) {
      useAppStore.getState().logout();
      return Promise.reject(error);
    }
    if (isAxiosError(error) && error.config?.suppressErrorNotification) {
      return Promise.reject(error);
    }
    if (!isAxiosError(error)) {
      notifications.addNotification({
        message: i18n.t({
          en: 'Error desconegut',
          fr: 'Error desconocido'
        }),
        type: 'error'
      });
      console.error(error);
      return Promise.reject(error as Error);
    }

    const backendMessage = extractErrorMessage(error.response?.data);
    const headerErrorMessage =
      error.response?.status === 431
        ? i18n.t({
            en: 'Les capçaleres de la sessió són massa grans. Torneu a iniciar sessió.',
            fr: 'Las cabeceras de la sesión son demasiado grandes. Vuelva a iniciar sesión.'
          })
        : null;
    notifications.addNotification({
      message:
        backendMessage ??
        headerErrorMessage ??
        i18n.t({
          en: 'Sol\u00b7licitud HTTP fallida',
          fr: 'Solicitud HTTP fallida'
        }),
      title: error.response?.status.toString(),
      type: 'error'
    });
    return Promise.reject(error);
  }
);
