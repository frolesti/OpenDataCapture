import type { InstrumentRecord } from '@opendatacapture/schemas/instrument-records';
import { THERA_NAMES } from '@opendatacapture/schemas/thera';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { read, utils, write } from 'xlsx';

import { THERA_UNIFIED_OPTION_ID } from '../../utils/thera-datahub';
import { useGlobalInstrumentVisualization } from '../useGlobalInstrumentVisualization';

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  excel: vi.fn(),
  notifications: vi.fn(),
  writeWorkbook: vi.fn<typeof import('xlsx').writeFileXLSX>(),
  records: [] as InstrumentRecord[],
  recordsOptions: undefined as undefined | { params: { groupId?: string; instrumentId?: string } },
  store: { currentGroup: { id: 'thera-group', hospitals: [] }, currentUser: { id: 'admin', username: 'admin' } }
}));
const infos = Object.entries(THERA_NAMES).map(([visit, name]) => ({
  id: visit,
  internal: { name, edition: 1 },
  details: { title: `THERA ${visit}` }
}));
const orionInfo = {
  id: 'orion',
  internal: { name: 'ORION_PR_2026_SELECTION', edition: 1 },
  details: { title: 'ORION' }
};
const infoQuery = {
  data: [
    ...infos,
    orionInfo,
    { id: 'omega', internal: { name: 'ESTUDI_OSTEOPOROSIS', edition: 1 }, details: { title: 'OMEGA-FF-AP-2025' } }
  ],
  isLoading: false
};
const instrument = { kind: 'FORM', content: {}, internal: { name: 'THERA_SGM_2026_V0', edition: 1 } };
vi.mock('@/hooks/useInstrumentInfoQuery', () => ({ useInstrumentInfoQuery: () => infoQuery }));
vi.mock('@/hooks/useInstrument', () => ({
  useInstrument: () => instrument
}));
vi.mock('@/hooks/useInstrumentRecords', () => ({
  useInstrumentRecords: (options: typeof mocks.recordsOptions) => {
    mocks.recordsOptions = options;
    return { data: mocks.records };
  }
}));
vi.mock('@/store', () => ({
  useAppStore: (selector: (store: typeof mocks.store) => unknown) => selector(mocks.store)
}));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useDownload: () => mocks.download,
  useNotificationsStore: () => ({ addNotification: mocks.notifications }),
  useTranslation: () => ({ t: (key: string) => key })
}));
vi.mock('@/utils/excel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/excel')>();
  return {
    ...actual,
    downloadSubjectTableExcel: (...args: Parameters<typeof actual.downloadSubjectTableExcel>) => {
      mocks.excel(...args);
      actual.downloadSubjectTableExcel(...args);
    }
  };
});
vi.mock('xlsx', async (importOriginal) => ({
  ...(await importOriginal<typeof import('xlsx')>()),
  writeFileXLSX: mocks.writeWorkbook
}));

function record(visit: string, value: number, patientCode = 'TH-01-01'): InstrumentRecord {
  const date = new Date('2025-01-01T12:00:00Z');
  return {
    id: `${patientCode}-${visit}`,
    instrumentId: visit,
    subjectId: 'investigator',
    groupId: 'thera-group',
    createdAt: date,
    updatedAt: date,
    date,
    data: { patient_code: patientCode, study_visit: visit, eva_dryness: value }
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.records = [record('V0', 2), record('V1', 4), record('V4', 7)];
});
afterEach(cleanup);

describe('THERA datahub integration', () => {
  it('offers one study instead of five independent visit options', () => {
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    expect(result.current.instrumentOptions[THERA_UNIFIED_OPTION_ID]).toBe('THERA-SGM-2026');
    for (const info of infos) expect(result.current.instrumentOptions[info.id]).toBeUndefined();
    expect(result.current.instrumentOptions.__ORION_PR_2026__).toBe('ORION-PR-2026');
    expect(result.current.instrumentOptions).toEqual({
      omega: 'OMEGA-FF-AP-2025',
      __ORION_PR_2026__: 'ORION-PR-2026',
      [THERA_UNIFIED_OPTION_ID]: 'THERA-SGM-2026'
    });
  });

  it('does not restore a saved template as a fourth study', async () => {
    localStorage.setItem('datahub:last-instrument:admin:thera-group', 'placeholder-template');
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    await waitFor(() => expect(result.current.instrumentId).toBeNull());
    expect(Object.keys(result.current.instrumentOptions)).toHaveLength(3);
    expect(result.current.instrumentOptions['placeholder-template']).toBeUndefined();
  });

  it('restores a previously selected visit as the unified study and loads all authorized study records', async () => {
    localStorage.setItem('datahub:last-instrument:admin:thera-group', 'V1');
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    await waitFor(() => expect(result.current.instrumentId).toBe(THERA_UNIFIED_OPTION_ID));
    expect(mocks.recordsOptions?.params).toMatchObject({ groupId: undefined, instrumentId: undefined });
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0]).toMatchObject({ v0_eva_dryness: 2, v1_eva_dryness: 4, v4_eva_dryness: 7 });
  });

  it('exports one Excel table with all patients and every visit column, including fields missing from the first patient', async () => {
    mocks.records = [
      record('V0', 2),
      ...['V0', 'V1', 'V2', 'V3', 'V4'].map((visit, index) => record(visit, index + 5, 'TH-01-02'))
    ];
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    act(() => result.current.setInstrumentId(THERA_UNIFIED_OPTION_ID));
    await waitFor(() => expect(result.current.records).toHaveLength(2));
    act(() => result.current.dl('Excel'));
    expect(mocks.excel).toHaveBeenCalledOnce();
    const [filename, rows, sheet] = mocks.excel.mock.calls[0]!;
    expect(filename).toContain('THERA_SGM_2026');
    expect(sheet).toBe('THERA_SGM_2026');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty('v4_eva_dryness', undefined);
    expect(rows[1]).toMatchObject({ v4_eva_dryness: 9, study_completed: true });
    expect(rows[0]).not.toHaveProperty('__visits__');
    expect(rows[0]).not.toHaveProperty('__data__');
    expect(rows[0]).not.toHaveProperty('__instrumentId__');
    const [workbook] = mocks.writeWorkbook.mock.calls[0]!;
    const reopened = read(write(workbook, { bookType: 'xlsx', type: 'buffer' }), { type: 'buffer' });
    expect(reopened.SheetNames).toEqual(['THERA_SGM_2026']);
    const savedRows = utils.sheet_to_json(reopened.Sheets.THERA_SGM_2026!);
    expect(savedRows).toHaveLength(2);
    expect(savedRows[1]).toMatchObject({
      v0_eva_dryness: 5,
      v1_eva_dryness: 6,
      v2_eva_dryness: 7,
      v3_eva_dryness: 8,
      v4_eva_dryness: 9,
      study_completed: true
    });
  });

  it('exports all visit columns to one CSV and honors the investigator filter', async () => {
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    act(() => result.current.setInstrumentId(THERA_UNIFIED_OPTION_ID));
    await waitFor(() => expect(result.current.records).toHaveLength(1));
    act(() => result.current.dl('CSV'));
    const [filename, content] = mocks.download.mock.calls[0]!;
    expect(filename).toContain('THERA_SGM_2026');
    expect(content()).toContain('v0_eva_dryness');
    expect(content()).toContain('v4_eva_dryness');
    const header = String(content()).split(/\r?\n/)[0]!.split(',');
    expect(header).toContain('date_collected');
    expect(header).toContain('subject_id');
    expect(header.every((column) => /^[a-z][a-z0-9_]*$/.test(column))).toBe(true);
    expect(result.current.formatFieldLabel?.('v0_eva_dryness')).toBe('v0_eva_dryness');
    act(() => result.current.setFilter('__subjectId__', 'other'));
    expect(result.current.records).toHaveLength(0);
  });

  it('keeps THERA patients out of the unified ORION dataset', async () => {
    mocks.records.push({
      ...record('V0', 5, 'OR-01-01'),
      instrumentId: 'orion'
    });
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    act(() => result.current.setInstrumentId('__ORION_PR_2026__'));
    await waitFor(() => expect(result.current.records).toHaveLength(1));
    expect(result.current.records[0]?.patient_code).toBe('OR-01-01');
  });

  it('keeps each ORION visit and its historical answers separate for record actions', async () => {
    const selection = {
      ...record('V0', 2, 'centre/patient 7'),
      instrumentId: 'orion',
      data: {
        patient_code: 'centre/patient 7',
        selection_visit_date: '01-01-2025',
        pain: 2
      }
    };
    const followup = {
      ...record('V1', 7, 'centre/patient 7'),
      instrumentId: 'historical-followup',
      data: {
        user_code: 'centre/patient 7',
        followup_date: '01-04-2025',
        pain: 7
      }
    };
    mocks.records = [selection, followup];
    const { result } = renderHook(() => useGlobalInstrumentVisualization());
    act(() => result.current.setInstrumentId('__ORION_PR_2026__'));
    await waitFor(() => expect(result.current.records).toHaveLength(1));
    const visits = result.current.records[0]?.__visits__;
    expect(visits).toHaveLength(2);
    expect(visits?.[0]).toMatchObject({ __id__: selection.id, __instrumentId__: 'orion', __data__: selection.data });
    expect(visits?.[1]).toMatchObject({
      __id__: followup.id,
      __instrumentId__: 'historical-followup',
      __data__: followup.data
    });
    expect(visits?.[0]?.label).toContain('Selección');
    expect(visits?.[1]?.label).toContain('Seguimiento');
  });
});
