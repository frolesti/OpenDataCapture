import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { INSTRUMENT_RECORDS_QUERY_KEY } from './useInstrumentRecords';

export function useDeleteInstrumentRecordMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await axios.delete(`/v1/instrument-records/${id}`);
    },
    onSuccess() {
      addNotification({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: [INSTRUMENT_RECORDS_QUERY_KEY] });
    }
  });
}
