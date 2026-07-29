import { $PendingInvestigator } from '@opendatacapture/schemas/user';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

export const PENDING_INVESTIGATORS_QUERY_KEY = 'pending-investigators';

export const pendingInvestigatorsQueryOptions = () => {
  return queryOptions({
    queryFn: async () => {
      const response = await axios.get('/v1/users/pending');
      return $PendingInvestigator.array().parse(response.data);
    },
    queryKey: [PENDING_INVESTIGATORS_QUERY_KEY]
  });
};

export function usePendingInvestigatorsQuery() {
  return useSuspenseQuery(pendingInvestigatorsQueryOptions());
}
