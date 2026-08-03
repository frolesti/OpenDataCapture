import { reviver } from '@douglasneuroinformatics/libjs';
import { $InstrumentRecord } from '@opendatacapture/schemas/instrument-records';
import type { InstrumentRecordQueryParams } from '@opendatacapture/schemas/instrument-records';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type UseInstrumentRecordsOptions = {
  enabled?: boolean;
  params: InstrumentRecordQueryParams;
};

export const INSTRUMENT_RECORDS_QUERY_KEY = 'instrument-records';

export const useInstrumentRecords = (
  { enabled, params }: UseInstrumentRecordsOptions = {
    enabled: true,
    params: {}
  }
) => {
  return useQuery({
    enabled,
    queryFn: async () => {
      const response = await axios.get('/v1/instrument-records', {
        params,
        transformResponse: [(data: string) => JSON.parse(data, reviver) as unknown]
      });
      return $InstrumentRecord.array().parseAsync(response.data);
    },
    queryKey: [INSTRUMENT_RECORDS_QUERY_KEY, ...Object.values(params)]
  });
};
