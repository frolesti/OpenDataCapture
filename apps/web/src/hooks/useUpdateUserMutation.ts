import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import type { UpdateUserData } from '@opendatacapture/schemas/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { PENDING_INVESTIGATORS_QUERY_KEY } from './usePendingInvestigatorsQuery';
import { USERS_QUERY_KEY } from './useUsersQuery';

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);
  return useMutation({
    mutationFn: async ({ data, id }: { data: UpdateUserData; id: string }) => {
      await axios.patch(`/v1/users/${id}`, data);
    },
    onSuccess() {
      addNotification({ type: 'success' });
      void queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [PENDING_INVESTIGATORS_QUERY_KEY] });
    }
  });
}
