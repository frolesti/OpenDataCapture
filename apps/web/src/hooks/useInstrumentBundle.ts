import { $InstrumentBundleContainer } from '@opendatacapture/schemas/instrument';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function useInstrumentBundle(id: null | string) {
  const queryClient = useQueryClient();

  return useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const queryKey = ['instrument-bundle', id] as const;

      const response = await axios.get(`/v1/instruments/bundle/${id}`, {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304
      });

      if (response.status === 304) {
        const cached = queryClient.getQueryData(queryKey);
        if (cached) {
          return cached;
        }

        // No cached payload available for a 304 response, force a fresh uncached fetch.
        const freshResponse = await axios.get(`/v1/instruments/bundle/${id}?cb=${Date.now()}`);
        return $InstrumentBundleContainer.parseAsync(freshResponse.data);
      }

      return $InstrumentBundleContainer.parseAsync(response.data);
    },
    queryKey: ['instrument-bundle', id]
  });
}
