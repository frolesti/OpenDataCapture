import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOrionPatientCode } from '../useOrionPatientCode';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

const options = {
  enabled: true,
  groupId: 'group',
  instrumentId: 'selection',
  sessionId: 'session',
  userId: 'investigator'
};

function createWrapper() {
  const client = new QueryClient();
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <StrictMode>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </StrictMode>
    );
  }
  return { client, wrapper: Wrapper };
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('ORION patient-code recovery', () => {
  it.each([400, 429, 500])('stops after one HTTP %s, including rerenders, focus and reconnect', async (status) => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status } });
    const { client, wrapper } = createWrapper();
    const { result, rerender, unmount } = renderHook(() => useOrionPatientCode(options), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    for (let count = 0; count < 10; count++) rerender();
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(result.current.isFetching).toBe(false);

    unmount();
    const remounted = renderHook(() => useOrionPatientCode(options), { wrapper });
    expect(remounted.result.current.isError).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
    remounted.unmount();
    client.clear();
  });

  it('allows one explicit retry after the hospital assignment is corrected', async () => {
    vi.mocked(axios.post)
      .mockRejectedValueOnce(new Error('Hospital not assigned'))
      .mockResolvedValueOnce({ data: { code: 'OR-01-01' } });
    const { client, wrapper } = createWrapper();
    const { result } = renderHook(() => useOrionPatientCode(options), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toBe('OR-01-01'));
    expect(result.current.isError).toBe(false);
    expect(axios.post).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('deduplicates an in-flight request across rerenders and StrictMode', async () => {
    let finish!: (value: { data: { code: string } }) => void;
    vi.mocked(axios.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const { client, wrapper } = createWrapper();
    const { result, rerender } = renderHook(() => useOrionPatientCode(options), { wrapper });
    for (let count = 0; count < 10; count++) rerender();
    expect(axios.post).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ data: { code: 'OR-01-01' } });
    });
    await waitFor(() => expect(result.current.data).toBe('OR-01-01'));
    expect(axios.post).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it.each([{ enabled: false }, { groupId: undefined }, { userId: undefined }])(
    'does not request a code when it is unnecessary or the context is missing: %j',
    (overrides) => {
      const { client, wrapper } = createWrapper();
      const { result } = renderHook(() => useOrionPatientCode({ ...options, ...overrides }), { wrapper });
      expect(result.current.isFetching).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
      client.clear();
    }
  );

  it('does not reuse a code or failure for another group, user, session or instrument', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 'OR-01-01' } });
    const { client, wrapper } = createWrapper();
    const { result, rerender } = renderHook((props) => useOrionPatientCode(props), {
      initialProps: options,
      wrapper
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const changes of [
      { groupId: 'other-group' },
      { userId: 'other-user' },
      { sessionId: 'other-session' },
      { instrumentId: 'other-instrument' }
    ]) {
      const previousCalls = vi.mocked(axios.post).mock.calls.length;
      rerender({ ...options, ...changes });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(axios.post).toHaveBeenCalledTimes(previousCalls + 1);
    }
    client.clear();
  });

  it('surfaces an invalid server response without retrying', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { code: '' } });
    const { client, wrapper } = createWrapper();
    const { result } = renderHook(() => useOrionPatientCode(options), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('did not return');
    expect(axios.post).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
