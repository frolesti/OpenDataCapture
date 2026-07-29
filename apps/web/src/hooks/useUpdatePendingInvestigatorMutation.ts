import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { $PendingInvestigator } from '@opendatacapture/schemas/user';
import type { UpdatePendingInvestigatorData } from '@opendatacapture/schemas/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { PENDING_INVESTIGATORS_QUERY_KEY } from './usePendingInvestigatorsQuery';

export function useUpdatePendingInvestigatorMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ data, id }: { data: UpdatePendingInvestigatorData; id: string }) => {
      const response = await axios.patch(`/v1/users/pending/${id}`, data);
      return $PendingInvestigator.parse(response.data);
    },
    onSuccess() {
      addNotification({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: [PENDING_INVESTIGATORS_QUERY_KEY] });
    }
  });
}
