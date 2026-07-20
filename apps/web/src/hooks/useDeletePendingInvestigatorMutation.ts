import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { PENDING_INVESTIGATORS_QUERY_KEY } from './usePendingInvestigatorsQuery';

export function useDeletePendingInvestigatorMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await axios.delete(`/v1/users/pending/${id}`);
    },
    onSuccess() {
      addNotification({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: [PENDING_INVESTIGATORS_QUERY_KEY] });
    }
  });
}
