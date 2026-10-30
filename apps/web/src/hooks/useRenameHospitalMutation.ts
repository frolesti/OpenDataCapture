import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { $HospitalOption } from '@opendatacapture/schemas/group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { GROUPS_QUERY_KEY } from './useGroupsQuery';
import { USERS_QUERY_KEY } from './useUsersQuery';

export function useRenameHospitalMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await axios.patch(`/v1/hospitals/${id}`, { name });
      return $HospitalOption.parse(response.data);
    },
    onSuccess: async () => {
      await Promise.all(
        [GROUPS_QUERY_KEY, USERS_QUERY_KEY, 'pending-investigators', 'current-user-profile-sync'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      );
      addNotification({ type: 'success' });
    }
  });
}
