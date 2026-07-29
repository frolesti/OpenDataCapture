import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { USERS_QUERY_KEY } from './useUsersQuery';
import { PENDING_INVESTIGATORS_QUERY_KEY } from './usePendingInvestigatorsQuery';

export function usePromotePendingInvestigatorMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await axios.post(`/v1/users/pending/${id}/promote`);
    },
    onSuccess() {
      addNotification({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: [PENDING_INVESTIGATORS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    }
  });
}
