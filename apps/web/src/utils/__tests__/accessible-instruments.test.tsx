import type { ComponentType, PropsWithChildren } from 'react';

import type { InstrumentRecord } from '@opendatacapture/schemas/instrument-records';
import {
  THERA_EXCLUSIONS,
  THERA_INCLUSIONS,
  THERA_NAMES,
  THERA_VAGINAL_ITEMS,
  THERA_VISIT_ORDER
} from '@opendatacapture/schemas/thera';
import { encodeScopedSubjectId } from '@opendatacapture/subject-utils';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Info = { id: string; details: { title: string }; internal: { name: string } };
const mocks = vi.hoisted(() => {
  const group = {
    id: 'thera',
    name: 'THERA',
    studyCode: null as string | null,
    accessibleInstrumentIds: ['V0', 'V1', 'V2', 'V3', 'V4']
  };
  return {
    component: undefined as ComponentType | undefined,
    navigate: vi.fn(),
    query: vi.fn(),
    refetch: vi.fn(),
    createSession: vi.fn(),
    records: [] as InstrumentRecord[],
    loading: false,
    error: false,
    store: {
      currentGroup: group,
      currentUser: { username: 'researcher', basePermissionLevel: 'STANDARD', groups: [group] },
      currentSession: null as null | { id: string },
      changeGroup: vi.fn(),
      startSession: vi.fn()
    }
  };
});
const infos = [
  ...THERA_VISIT_ORDER.map((visit) => ({
    id: visit,
    internal: { name: THERA_NAMES[visit], edition: 1 },
    details: { title: visit }
  })),
  { id: 'orion-selection', internal: { name: 'ORION_PR_2026_SELECTION' }, details: { title: 'ORION basal' } },
  { id: 'orion-followup', internal: { name: 'ORION_PR_2026_FOLLOWUP' }, details: { title: 'ORION seguimiento' } }
];
const eligible = {
  patient_code: 'TH-01-01',
  informed_consent: 'si',
  age: 18,
  eva_dryness: 5,
  eva_dyspareunia: 0,
  ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
  ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
  ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
};
function record(
  visit: (typeof THERA_VISIT_ORDER)[number],
  overrides: Partial<InstrumentRecord> = {}
): InstrumentRecord {
  const date = new Date('2025-01-01');
  return {
    id: visit,
    instrumentId: visit,
    groupId: 'thera',
    subjectId: encodeScopedSubjectId('researcher', { groupName: 'THERA' }),
    date,
    createdAt: date,
    updatedAt: date,
    data: {
      ...eligible,
      study_visit: visit,
      visit_date: {
        V0: '2024-12-01',
        V1: '2025-01-01',
        V2: '2025-04-01',
        V3: '2025-07-01',
        V4: '2026-01-01'
      }[visit]
    },
    ...overrides
  };
}
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: string | { en: string }) => (typeof value === 'string' ? value : value.en) })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => ({
  Heading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
  Button: ({ children, onClick }: PropsWithChildren<{ onClick: () => void }>) => (
    <button onClick={onClick}>{children}</button>
  )
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    mocks.component = options.component;
    return options;
  },
  useNavigate: () => mocks.navigate
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/components/InstrumentShowcase', () => ({
  InstrumentShowcase: ({ data }: { data: Info[] }) => (
    <ul>
      {data.map((info) => (
        <li key={info.id}>{info.details.title}</li>
      ))}
    </ul>
  )
}));
vi.mock('@/components/WithFallback', () => ({
  WithFallback: ({ Component, props }: { Component: ComponentType<{ data: Info[] }>; props: { data?: Info[] } }) => (
    <Component {...props} data={props.data ?? []} />
  )
}));
vi.mock('@/hooks/useInstrumentInfoQuery', () => ({ useInstrumentInfoQuery: () => ({ data: infos }) }));
vi.mock('@/hooks/useInstrumentRecords', () => ({
  useInstrumentRecords: (options: {
    enabled: boolean;
    params: { groupId?: string; subjectId?: string; instrumentId?: string; instrumentName?: string };
  }) => {
    mocks.query(options);
    const records = mocks.records.filter(
      (record) =>
        (!options.params.groupId || record.groupId === options.params.groupId) &&
        (!options.params.subjectId || record.subjectId === options.params.subjectId) &&
        (!options.params.instrumentId || record.instrumentId === options.params.instrumentId) &&
        (!options.params.instrumentName || record.instrumentId === 'orion-followup')
    );
    return {
      data: mocks.loading ? undefined : records,
      isError: mocks.error,
      refetch: mocks.refetch
    };
  }
}));
vi.mock('@/hooks/useCreateSessionMutation', () => ({
  useCreateSessionMutation: () => ({ mutateAsync: mocks.createSession })
}));
vi.mock('@/store', () => ({
  useAppStore: (selector: (store: typeof mocks.store) => unknown) => selector(mocks.store)
}));

import '../../routes/_app/instruments/accessible-instruments';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2025-04-01T12:00:00Z'));
  vi.clearAllMocks();
  localStorage.clear();
  mocks.records = [];
  mocks.loading = false;
  mocks.error = false;
  mocks.store.currentSession = null;
  mocks.store.currentUser.basePermissionLevel = 'STANDARD';
  mocks.store.currentGroup = {
    id: 'thera',
    name: 'THERA',
    studyCode: null,
    accessibleInstrumentIds: [...THERA_VISIT_ORDER]
  };
  mocks.store.currentUser.groups = [mocks.store.currentGroup];
  for (const info of infos) {
    if ('edition' in info.internal) info.internal.edition = 1;
  }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function visibleVisits() {
  return screen.getAllByRole('listitem').map((item) => item.textContent);
}

describe('sequential study instrument visibility', () => {
  it('shows and restores every edition-10 visit without earlier records or waiting for their dates', async () => {
    for (const info of infos) {
      if ('edition' in info.internal) info.internal.edition = 10;
    }
    mocks.loading = true;
    mocks.store.currentSession = { id: 'session' };
    localStorage.setItem('last-instrument:session', 'V4');
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual([...THERA_VISIT_ORDER]);
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({ params: { id: 'V4' }, to: '/instruments/render/$id' })
      )
    );
  });

  it('initially shows only the baseline to an investigator', () => {
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0']);
  });

  it.each([1, 2, 3, 4, 5])('unlocks only the next unfinished visit after %i saved visits', (count) => {
    vi.setSystemTime(
      new Date(`${['2025-01-01', '2025-04-01', '2025-07-01', '2026-01-01', '2026-01-01'][count - 1]}T12:00:00Z`)
    );
    mocks.records = THERA_VISIT_ORDER.slice(0, count).map((visit) => record(visit));
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(count === 5 ? ['V0'] : ['V0', THERA_VISIT_ORDER[count]]);
  });

  it('does not unlock the third or fourth visit when the second is missing', () => {
    mocks.records = [record('V0'), record('V1'), record('V3')];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0', 'V2']);
  });

  it('keeps progress separate for each patient and excludes completed patients', () => {
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    mocks.records = [
      ...THERA_VISIT_ORDER.map((visit) => record(visit)),
      record('V0', {
        id: 'other-patient',
        data: { ...eligible, patient_code: 'TH-01-02', study_visit: 'V0', visit_date: '2024-12-01' }
      })
    ];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0', 'V1']);
  });

  it('does not unlock follow-ups for a screen failure', () => {
    mocks.records = [record('V0', { data: { ...eligible, exclusion_1: 'si', study_visit: 'V0' } })];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0']);
  });

  it('uses persisted visit metadata from historical editions', () => {
    mocks.records = [record('V0', { instrumentId: 'old-baseline' }), record('V1', { instrumentId: 'old-first' })];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0', 'V2']);
  });

  it('never uses another group or investigator to unlock a follow-up', () => {
    mocks.records = [record('V0', { groupId: 'other-group' }), record('V0', { subjectId: 'other-investigator' })];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0']);
    expect(mocks.query).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        params: { groupId: 'thera', subjectId: encodeScopedSubjectId('researcher', { groupName: 'THERA' }) }
      })
    );
  });

  it('shows all assigned THERA and ORION forms to administrators without prior patient records', () => {
    mocks.store.currentUser.basePermissionLevel = 'ADMIN';
    mocks.store.currentGroup.accessibleInstrumentIds = infos.map((info) => info.id);
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual([...THERA_VISIT_ORDER, 'ORION basal', 'ORION seguimiento']);
  });

  it.each(['TH', 'OR'])(
    'never offers another study inside a configured %s group, even to administrators',
    (studyCode) => {
      mocks.store.currentUser.basePermissionLevel = 'ADMIN';
      mocks.store.currentGroup.studyCode = studyCode;
      mocks.store.currentGroup.accessibleInstrumentIds = infos.map((info) => info.id);
      const Component = mocks.component!;
      render(<Component />);
      expect(visibleVisits()).toEqual(
        studyCode === 'TH' ? [...THERA_VISIT_ORDER] : ['ORION basal', 'ORION seguimiento']
      );
    }
  );

  it('does not restore a saved link to a locked future visit', () => {
    mocks.store.currentSession = { id: 'session' };
    localStorage.setItem('last-instrument:session', 'V4');
    mocks.records = [record('V0'), record('V1')];
    const Component = mocks.component!;
    render(<Component />);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('waits for persisted patient progress before restoring the last unlocked visit', async () => {
    mocks.store.currentSession = { id: 'session' };
    localStorage.setItem('last-instrument:session', 'V2');
    mocks.loading = true;
    const Component = mocks.component!;
    const view = render(<Component />);
    expect(mocks.navigate).not.toHaveBeenCalled();
    mocks.loading = false;
    mocks.records = [record('V0'), record('V1')];
    view.rerender(<Component />);
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { id: 'V2' },
          to: '/instruments/render/$id'
        })
      )
    );
  });

  it('shows a retryable error instead of silently treating failed record loading as no patient progress', () => {
    mocks.error = true;
    mocks.records = [record('V0')];
    const Component = mocks.component!;
    render(<Component />);
    expect(visibleVisits()).toEqual(['V0']);
    expect(screen.getByRole('alert')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
