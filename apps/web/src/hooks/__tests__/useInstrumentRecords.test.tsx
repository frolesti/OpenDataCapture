import type { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, expect, it, vi } from 'vitest';

import { useInstrumentRecords } from '../useInstrumentRecords';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('allows local THERA progress errors and explicit recovery despite the global error policy', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, throwOnError: true } }
  });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const error = new Error('No es poden carregar les visites');
  vi.mocked(axios.get).mockRejectedValueOnce(error).mockResolvedValueOnce({ data: [] });
  const { result, unmount } = renderHook(
    () => useInstrumentRecords({ params: { groupId: 'thera' }, throwOnError: false }),
    { wrapper: Wrapper }
  );
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
  expect(axios.get).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([]);
  expect(axios.get).toHaveBeenCalledTimes(2);
  unmount();
  client.clear();
});
