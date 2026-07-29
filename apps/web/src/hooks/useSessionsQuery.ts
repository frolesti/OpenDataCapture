import { $Session } from '@opendatacapture/schemas/session';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import axios from 'axios';

export const SESSIONS_QUERY_KEY = 'sessions';

export const sessionsQueryOptions = (userId?: string) => {
  return queryOptions({
    queryFn: async () => {
      const response = await axios.get('/v1/sessions', {
        params: {
          userId
        }
      });
      return $Session.array().parse(response.data);
    },
    queryKey: [SESSIONS_QUERY_KEY, userId ?? null]
  });
};

export function useSessionsQuery(userId?: string) {
  return useSuspenseQuery(sessionsQueryOptions(userId));
}
