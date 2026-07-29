import { $Group } from '@opendatacapture/schemas/group';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

export const GROUPS_QUERY_KEY = 'groups';

export const groupsQueryOptions = () => {
  return queryOptions({
    queryFn: async () => {
      const response = await axios.get('/v1/groups');
      const normalized = Array.isArray(response.data)
        ? response.data.map((group) => ({
            ...group,
            hospitals: Array.isArray(group?.hospitals) ? group.hospitals : []
          }))
        : response.data;

      return $Group.array().parse(normalized);
    },
    queryKey: [GROUPS_QUERY_KEY]
  });
};

export function useGroupsQuery() {
  return useSuspenseQuery(groupsQueryOptions());
}
