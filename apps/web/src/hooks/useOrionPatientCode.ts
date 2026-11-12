import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type OrionPatientCodeOptions = {
  enabled: boolean;
  groupId?: string;
  instrumentId: string;
  sessionId?: string;
  userId?: string;
  study?: 'OR' | 'TH';
};

export function useOrionPatientCode({
  enabled,
  groupId,
  instrumentId,
  sessionId,
  userId,
  study = 'OR'
}: OrionPatientCodeOptions) {
  return useQuery({
    enabled: enabled && Boolean(groupId && userId),
    queryKey: [study === 'TH' ? 'thera-patient-code' : 'orion-patient-code', userId, groupId, sessionId, instrumentId],
    queryFn: async () => {
      const { data } = await axios.post<{ code: string }>(
        `/v1/instrument-records/${study === 'TH' ? 'thera' : 'orion'}-patient-code`,
        { groupId }
      );
      if (typeof data.code !== 'string' || !data.code.trim()) {
        throw new Error(`The server did not return a ${study === 'TH' ? 'THERA' : 'ORION'} patient code`);
      }
      return data.code;
    },
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });
}
