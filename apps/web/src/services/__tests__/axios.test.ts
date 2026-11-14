import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ notification: vi.fn(), logout: vi.fn(), token: vi.fn<() => null | string>() }));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useNotificationsStore: { getState: () => ({ addNotification: mocks.notification }) }
}));
vi.mock('@douglasneuroinformatics/libui/i18n', () => ({
  i18n: { t: (value: { en: string }) => value.en }
}));
vi.mock('@/store', () => ({
  useAppStore: { getState: () => ({ accessToken: mocks.token(), logout: mocks.logout }) }
}));
vi.mock('@/config', () => ({
  config: { setup: { apiBaseUrl: '/api' }, dev: { networkLatency: 0 } }
}));

import '../axios';

const adapter = axios.defaults.adapter;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockReturnValue(null);
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
  it.each([
    ['post', '/v1/auth/login'],
    ['post', '/v1/setup'],
    ['get', '/v1/setup']
  ])('does not send an old token to the public %s %s endpoint', async (method, url) => {
    mocks.token.mockReturnValue('old-session-token');
    let authorization: unknown;
    axios.defaults.adapter = async (config) => {
      authorization = config.headers.get('Authorization');
      return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
    };
    await axios.request({ method, url, headers: { Authorization: 'Bearer stale-token' } });
    expect(authorization).toBeUndefined();
  });

  it('still sends the signed token to protected endpoints', async () => {
    mocks.token.mockReturnValue('signed-token');
    let authorization: unknown;
    axios.defaults.adapter = async (config) => {
      authorization = config.headers.get('Authorization');
      return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
    };
    await axios.get('/v1/users/me');
    expect(authorization).toBe('Bearer signed-token');
  });

  it.each(['patch', 'delete'])('preserves authentication for the protected setup %s operation', async (method) => {
    mocks.token.mockReturnValue('signed-token');
    let authorization: unknown;
    axios.defaults.adapter = async (config) => {
      authorization = config.headers.get('Authorization');
      return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
    };
    await axios.request({ method, url: '/v1/setup' });
    expect(authorization).toBe('Bearer signed-token');
  });

  it('explains HTTP 431 without misreporting a missing resource', async () => {
    axios.defaults.adapter = async (config) => {
      throw new AxiosError('Large headers', 'ERR_BAD_REQUEST', config, undefined, {
        config,
        data: '',
        headers: {},
        status: 431,
        statusText: 'Request Header Fields Too Large'
      });
    };
    await expect(axios.get('/v1/instrument-records')).rejects.toBeInstanceOf(AxiosError);
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '431',
        message: 'Les capçaleres de la sessió són massa grans. Torneu a iniciar sessió.'
      })
    );
    expect(mocks.logout).not.toHaveBeenCalled();
  });

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
