import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInstrumentInfoQuery } from '../useInstrumentInfoQuery';

type Info = {
  details: { title: string };
  id: string;
  internal: { name: string };
};

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  queryFn: undefined as undefined | (() => Promise<Info[]>)
}));

vi.mock('axios', () => ({ default: { get: mocks.get } }));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ resolvedLanguage: 'ca' })
}));
vi.mock('@opendatacapture/instrument-utils', () => ({
  translateInstrumentInfo: (info: Info) => info
}));
vi.mock('@opendatacapture/schemas/instrument', () => ({
  $InstrumentInfo: { array: () => ({ parseAsync: async (infos: Info[]) => infos }) }
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryFn: () => Promise<Info[]> }) => {
    mocks.queryFn = options.queryFn;
    return {};
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryFn = undefined;
});

describe('clinical instrument catalogue', () => {
  it('excludes unfinished templates and retired forms without renaming the three real studies', async () => {
    const studies: Info[] = [
      { id: 'omega', internal: { name: 'ESTUDI_OSTEOPOROSIS' }, details: { title: 'OMEGA-FF-AP-2025' } },
      { id: 'orion', internal: { name: 'ORION_PR_2026_SELECTION' }, details: { title: 'ORION-PR-2026' } },
      { id: 'thera', internal: { name: 'THERA_SGM_2026_V0' }, details: { title: 'THERA-SGM-2026' } }
    ];
    const templates: Info[] = [
      { id: 'blank', internal: { name: '<PLACEHOLDER>' }, details: { title: '<PLACEHOLDER>' } },
      { id: 'named', internal: { name: 'UNFINISHED' }, details: { title: '<PLACEHOLDER>' } },
      { id: 'retitled', internal: { name: '<PLACEHOLDER>' }, details: { title: 'Example form' } },
      { id: 'retired', internal: { name: 'THERA_SGM_2026_END' }, details: { title: 'Finalización' } }
    ];
    const source = [...studies, ...templates];
    mocks.get.mockResolvedValue({ data: source });
    useInstrumentInfoQuery();
    if (!mocks.queryFn) throw new Error('Instrument query was not initialized');
    expect(await mocks.queryFn()).toEqual(studies);
    expect(source).toHaveLength(7);
    expect(source[3]?.details.title).toBe('<PLACEHOLDER>');
  });
});
