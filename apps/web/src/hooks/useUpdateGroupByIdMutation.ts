import { useNotificationsStore } from '@douglasneuroinformatics/libui/hooks';
import { $Group } from '@opendatacapture/schemas/group';
import type { Group, UpdateGroupData } from '@opendatacapture/schemas/group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { GROUPS_QUERY_KEY } from './useGroupsQuery';

export function useUpdateGroupByIdMutation() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationsStore((store) => store.addNotification);

  return useMutation({
    mutationFn: async ({ data, id }: { data: UpdateGroupData; id: string }) => {
      const response = await axios.patch(`/v1/groups/${id}`, data);
      return $Group.parseAsync(response.data);
    },
    onSuccess(updatedGroup) {
      addNotification({ type: 'success' });
      queryClient.setQueryData<Group[]>([GROUPS_QUERY_KEY], (previous) =>
        previous ? previous.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)) : previous
      );
      void queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
    }
  });
}
