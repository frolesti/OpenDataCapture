import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { $PendingInvestigator } from '@opendatacapture/schemas/user';
import type { CreatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { PENDING_INVESTIGATORS_QUERY_KEY } from './usePendingInvestigatorsQuery';

export function useCreatePendingInvestigatorMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ data }: { data: CreatePendingInvestigatorData; suppressSuccessNotification?: boolean }) => {
      const response = await axios.post('/v1/users/pending', data);
      return $PendingInvestigator.parse(response.data);
    },
    onSuccess(_result, variables) {
      if (!variables.suppressSuccessNotification) {
        addNotification({ type: 'success' });
      }
      void queryClient.invalidateQueries({ queryKey: [PENDING_INVESTIGATORS_QUERY_KEY] });
    }
  });
}
