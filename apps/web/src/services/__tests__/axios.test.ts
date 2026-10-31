import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ notification: vi.fn(), logout: vi.fn() }));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useNotificationsStore: { getState: () => ({ addNotification: mocks.notification }) }
}));
vi.mock('@douglasneuroinformatics/libui/i18n', () => ({
  i18n: { t: (value: { en: string }) => value.en }
}));
vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ accessToken: null, logout: mocks.logout }) }
}));
vi.mock('@/config', () => ({
  config: { setup: { apiBaseUrl: '/api' }, dev: { networkLatency: 0 } }
}));

import '../axios';

const adapter = axios.defaults.adapter;
beforeEach(() => {
  vi.clearAllMocks();
  axios.defaults.adapter = async (config) => {
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config,
      data: { message: 'Session unavailable' }
    });
  };
});
afterEach(() => {
  axios.defaults.adapter = adapter;
});

describe('submission notification ownership', () => {
  it('notifies once for an ordinary failed request', async () => {
    await expect(axios.get('/v1/example')).rejects.toBeInstanceOf(AxiosError);
    expect(mocks.notification).toHaveBeenCalledTimes(1);
  });

  it('leaves handled submission errors to the caller without a second global notification', async () => {
    try {
      await axios.post('/v1/instrument-records', {}, { suppressErrorNotification: true });
    } catch {
      mocks.notification({ type: 'error', message: 'Session unavailable' });
    }
    expect(mocks.notification).toHaveBeenCalledTimes(1);
  });

  it('never hides authentication expiry even on a locally handled request', async () => {
    axios.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: {}
      });
    };
    await expect(axios.get('/v1/sessions/session', { suppressErrorNotification: true })).rejects.toBeInstanceOf(
      AxiosError
    );
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
});
