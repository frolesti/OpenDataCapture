import { runInNewContext } from 'node:vm';

import { StrictMode, useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { replacer, reviver } from '@douglasneuroinformatics/libjs';
import type { InstrumentSubmitHandler } from '@opendatacapture/react-core';
import type { Group } from '@opendatacapture/schemas/group';
import type { StudyHospital } from '@opendatacapture/schemas/user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deserializeInstrumentDraft, serializeInstrumentDraft } from '../../utils/instrument-draft';
import { loadSchema, selectionData } from '../../utils/__tests__/orion-test-utils';
import { THERA_EXCLUSIONS, THERA_INCLUSIONS, THERA_VAGINAL_ITEMS } from '@opendatacapture/schemas/thera';

const mocks = vi.hoisted(() => ({
  bundle: {
    id: 'selection',
    kind: 'FORM',
    internal: { name: 'ORION_PR_2026_SELECTION', edition: 1 },
    bundle: '({})'
  },
  bundleContext: {} as { [key: string]: unknown },
  change: undefined as ((data: { [key: string]: unknown }) => void) | undefined,
  navigate: vi.fn(),
  notification: vi.fn(),
  refetchRecords: vi.fn(),
  recordRequests: vi.fn(),
  renderedBundle: '',
  renderedInitialData: undefined as undefined | { [key: string]: unknown },
  rendererMounts: 0,
  renderedInitialStep: 0,
  stepChange: undefined as ((step: number) => void) | undefined,
  records: [] as Record<string, unknown>[],
  extraInfo: [] as { id: string; internal: { name: string } }[],
  search: {} as { recordId?: string },
  state: {} as { initialData?: { [key: string]: unknown }; recordSubjectId?: string },
  store: {
    currentGroup: { hospitals: [], id: 'group', name: 'ORION' } as Partial<Group> &
      Pick<Group, 'hospitals' | 'id' | 'name'>,
    currentSession: { id: 'session', subject: { id: 'subject' } },
    currentUser: {
      basePermissionLevel: 'STANDARD',
      id: 'investigator',
      studyHospitals: [] as StudyHospital[],
      username: 'investigator'
    },
    setIsCurrentSessionSubmitted: vi.fn(),
    startSession: vi.fn()
  },
  submit: undefined as InstrumentSubmitHandler | undefined
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    isAxiosError: (error: unknown) => Boolean(error && typeof error === 'object' && 'isAxiosError' in error)
  }
}));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useNotificationsStore: () => ({ addNotification: mocks.notification }),
  useTranslation: () => ({ t: (value: { en: string }) => value.en })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    Button: ({ children, ...props }: PropsWithChildren) => <button {...props}>{children}</button>,
    Heading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
    Spinner: () => <div data-testid="spinner" />,
    Dialog: Object.assign(
      ({ children, open }: PropsWithChildren<{ open?: boolean }>) =>
        open ? <div role="dialog">{children}</div> : null,
      { Content: Container, Header: Container, Title: Container, Description: Container }
    )
  };
});
vi.mock('@opendatacapture/react-core', () => ({
  InstrumentRenderer: ({
    initialData,
    initialStep,
    onDataChange,
    onStepChange,
    onSubmit,
    target
  }: {
    initialData?: Record<string, unknown>;
    initialStep: number;
    onDataChange?: (data: Record<string, unknown>) => void;
    onStepChange: (step: number) => void;
    onSubmit: InstrumentSubmitHandler;
    target: { bundle: string };
  }) => {
    mocks.change = onDataChange;
    mocks.submit = onSubmit;
    mocks.renderedBundle = target.bundle;
    mocks.renderedInitialData = initialData;
    mocks.renderedInitialStep = initialStep;
    mocks.stepChange = onStepChange;
    useEffect(() => {
      mocks.rendererMounts++;
    }, []);
    return <div data-testid="renderer">{String(initialData?.patient_code ?? '')}</div>;
  }
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: unknown }) => ({
    ...options,
    useParams: () => ({ id: 'selection' }),
    useSearch: () => mocks.search
  }),
  useLocation: () => ({ state: mocks.state }),
  useNavigate: () => mocks.navigate
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/hooks/useInstrumentBundle', () => ({
  useInstrumentBundle: () => ({ data: mocks.bundle, isError: false })
}));
vi.mock('@/hooks/useInstrumentInfoQuery', () => ({
  useInstrumentInfoQuery: () => ({ data: [mocks.bundle, ...mocks.extraInfo] })
}));
vi.mock('@/hooks/useInstrumentRecords', () => ({
  INSTRUMENT_RECORDS_QUERY_KEY: 'instrument-records',
  useInstrumentRecords: (options: unknown) => {
    mocks.recordRequests(options);
    return { data: mocks.records, isLoading: false, refetch: mocks.refetchRecords };
  }
}));
vi.mock('@/store', () => ({
  useAppStore: Object.assign((selector: (store: typeof mocks.store) => unknown) => selector(mocks.store), {
    getState: () => mocks.store
  })
}));

import { Route } from '../../routes/_app/instruments/render/$id';

const Component = Route.component;
const selectionSchema = loadSchema('orion-pr-2026.ts');
let client: QueryClient;

function renderForm() {
  client = new QueryClient({ defaultOptions: { queries: { throwOnError: true } } });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Component />
      </QueryClientProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  mocks.search = {};
  mocks.state = {};
  mocks.submit = undefined;
  mocks.change = undefined;
  mocks.renderedBundle = '';
  mocks.renderedInitialData = undefined;
  mocks.renderedInitialStep = 0;
  mocks.rendererMounts = 0;
  mocks.stepChange = undefined;
  mocks.bundleContext = {};
  mocks.records = [];
  mocks.extraInfo = [];
  mocks.bundle.internal.name = 'ORION_PR_2026_SELECTION';
  mocks.bundle.internal.edition = 1;
  mocks.bundle.bundle = '({})';
  mocks.store.currentUser.studyHospitals = [];
  mocks.store.currentUser.basePermissionLevel = 'STANDARD';
  mocks.store.currentGroup = { id: 'group', name: 'ORION', hospitals: [] };
  localStorage.clear();
  vi.resetAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: { groupId: 'group', subjectId: 'subject' } });
});

describe('THERA patient identity and persisted visit anchors', () => {
  const baselineData = {
    patient_code: 'TH-01-01',
    site_hospital: 'Hospital THERA',
    visit_date: '2024-01-31',
    informed_consent: 'si',
    age: 18,
    eva_dryness: 5,
    eva_dyspareunia: 0,
    ...Object.fromEntries(THERA_INCLUSIONS.map((key) => [key, 'si'])),
    ...Object.fromEntries(THERA_EXCLUSIONS.map((key) => [key, 'no'])),
    ...Object.fromEntries(THERA_VAGINAL_ITEMS.map((key) => [key, 3]))
  };
  function prepareThera(visit: 'V0' | 'V1' | 'V2' | 'V3' | 'V4' = 'V1') {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(
      new Date(
        { V0: '2024-01-31', V1: '2024-02-29', V2: '2024-05-29', V3: '2024-08-29', V4: '2025-02-28' }[visit] +
          'T12:00:00Z'
      )
    );
    mocks.bundle.internal.name = `THERA_SGM_2026_${visit}`;
    mocks.store.currentGroup = { id: 'group', name: 'THERA', hospitals: [] };
    mocks.extraInfo = [
      { id: 'baseline', internal: { name: 'THERA_SGM_2026_V0' } },
      { id: 'first', internal: { name: 'THERA_SGM_2026_V1' } }
    ];
    mocks.records = [{ id: 'baseline-record', instrumentId: 'baseline', data: baselineData }];
  }
  it('keeps edition-10 follow-ups open without a basal and preserves progress while typing the code', () => {
    prepareThera('V4');
    mocks.bundle.internal.edition = 10;
    mocks.records = [];
    renderForm();
    expect(screen.getByTestId('renderer')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('no consta la fecha');
    act(() => mocks.stepChange?.(1));
    const mounts = mocks.rendererMounts;
    for (const patient_code of ['p', 'pa', 'patient']) {
      act(() => mocks.change?.({ patient_code, visit_date: '2099-01-01', eva_dryness: 6 }));
    }
    expect(mocks.rendererMounts).toBe(mounts);
    expect(mocks.renderedInitialStep).toBe(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.store.startSession).not.toHaveBeenCalled();
    expect(mocks.store.setIsCurrentSessionSubmitted).not.toHaveBeenCalled();
    const draft = deserializeInstrumentDraft(localStorage.getItem('instrument-draft:selection:investigator')!);
    expect(draft.data).toMatchObject({ patient_code: 'patient', visit_date: '2099-01-01', eva_dryness: 6 });
  });

  it('updates the advisory period when the typed code or date changes without remounting', () => {
    prepareThera();
    mocks.bundle.internal.edition = 10;
    mocks.state.initialData = { patient_code: 'TH-01-01', visit_date: '2099-01-01' };
    renderForm();
    const mounts = mocks.rendererMounts;
    act(() => mocks.change?.({ patient_code: 'TH-01-01', visit_date: '2099-01-01' }));
    expect(screen.getByRole('status').textContent).toContain('22/02/2024 a 07/03/2024');
    expect(screen.getByRole('status').textContent).toContain('fuera de este periodo');
    act(() => mocks.change?.({ patient_code: 'TH-01-01', visit_date: '2024-02-29' }));
    expect(screen.getByRole('status').textContent).not.toContain('fuera de este periodo');
    act(() => mocks.change?.({ patient_code: 'TH-01-01', visit_date: '' }));
    expect(screen.getByRole('status').textContent).not.toContain('fuera de este periodo');
    act(() => mocks.change?.({ patient_code: 'another-patient', visit_date: '2024-02-29' }));
    expect(screen.getByRole('status').textContent).toContain('no consta la fecha');
    expect(mocks.rendererMounts).toBe(mounts);
  });

  it('offers every group hospital and retains a free-text code in edition 10', async () => {
    prepareThera();
    mocks.bundle.internal.edition = 10;
    mocks.store.currentGroup.hospitals = ['Hospital THERA', 'Otro hospital'];
    mocks.bundle.bundle = `Promise.resolve({
      content: [{ fields: {
        site_hospital: { kind: 'string', variant: 'select', options: { old: 'Old' } },
        patient_code: { kind: 'string', variant: 'input' }
      } }]
    })`;
    renderForm();
    const form = await (runInNewContext(mocks.renderedBundle) as Promise<{
      content: { fields: { site_hospital: { options: Record<string, string> }; patient_code: { variant: string } } }[];
    }>);
    expect(form.content[0]?.fields.site_hospital.options).toEqual({
      'Hospital THERA': 'Hospital THERA',
      'Otro hospital': 'Otro hospital'
    });
    expect(form.content[0]?.fields.patient_code.variant).toBe('input');
  });

  it.each([true, false])(
    'submits only actual saved references for the chosen edition-10 patient (known=%s)',
    async (known) => {
      prepareThera('V3');
      mocks.bundle.internal.edition = 10;
      mocks.records.push({
        id: 'first-record',
        instrumentId: 'first',
        data: { patient_code: 'TH-01-01', visit_date: '2024-02-29' }
      });
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      renderForm();
      const data = {
        patient_code: known ? 'TH-01-01' : 'another-patient',
        site_hospital: 'Hospital THERA',
        visit_date: '2099-01-01',
        baseline_date: 'forged',
        first_visit_date: 'forged',
        _thera_test_dates: true,
        eva_dryness: 6
      };
      act(() => mocks.change?.(data));
      const submit = mocks.submit;
      if (!submit) throw new Error('The instrument submit handler was not rendered');
      await act(async () => {
        await submit({ data, instrumentId: 'selection' });
      });
      const request = vi.mocked(axios.post).mock.calls.find(([url]) => url === '/v1/instrument-records');
      expect(request?.[1].data).toMatchObject({ patient_code: data.patient_code, eva_dryness: 6 });
      expect(request?.[1].data).not.toHaveProperty('_thera_test_dates');
      if (known) {
        expect(request?.[1].data).toMatchObject({ baseline_date: '2024-01-31', first_visit_date: '2024-02-29' });
      } else {
        expect(request?.[1].data).not.toHaveProperty('baseline_date');
        expect(request?.[1].data).not.toHaveProperty('first_visit_date');
      }
    }
  );
  it('opens THERA without requesting or preassigning a patient code', async () => {
    prepareThera('V0');
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 'TH-01-02' } });
    renderForm();
    await screen.findByTestId('renderer');
    expect(axios.post).not.toHaveBeenCalled();
    expect(mocks.renderedInitialData?.patient_code).toBeUndefined();
  });

  it.each(['STANDARD', 'ADMIN'])('preserves a THERA draft without reserving a code for %s', async (role) => {
    prepareThera('V0');
    mocks.store.currentUser.basePermissionLevel = role;
    const message = 'El grup THERA no té configurat el codi d’estudi TH.';
    const draft = serializeInstrumentDraft({ age: 50 });
    localStorage.setItem('instrument-draft:selection:investigator', draft);
    vi.mocked(axios.post)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 400, data: { message } }
      })
      .mockResolvedValueOnce({ data: { code: 'TH-01-02' } });
    renderForm();
    await screen.findByTestId('renderer');
    expect(localStorage.getItem('instrument-draft:selection:investigator')).toBe(draft);
    expect(mocks.renderedInitialData?.age).toBe(50);
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('requires selecting an eligible patient and loads the saved basal date and hospital', async () => {
    prepareThera();
    renderForm();
    expect(screen.getByTestId('renderer')).toBeDefined();
    expect(screen.queryByRole('combobox')).toBeNull();
    act(() => mocks.change?.({ patient_code: 'TH-01-01' }));
    await screen.findByTestId('renderer');
    expect(mocks.renderedInitialData).toMatchObject({
      patient_code: 'TH-01-01',
      baseline_date: '2024-01-31',
      site_hospital: 'Hospital THERA'
    });
  });
  it('does not offer screen failures or patients who already have this visit', () => {
    prepareThera();
    mocks.records.push(
      {
        id: 'failed',
        instrumentId: 'baseline',
        data: { ...baselineData, patient_code: 'TH-01-02', exclusion_1: 'si' }
      },
      { id: 'completed', instrumentId: 'first', data: { patient_code: 'TH-01-01', visit_date: '2024-02-29' } }
    );
    renderForm();
    expect(screen.queryByRole('option', { name: 'TH-01-01' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'TH-01-02' })).toBeNull();
    expect(screen.queryByTestId('renderer')).toBeNull();
  });
  it('does not offer completed patients for another visit, including historical V4 editions', () => {
    prepareThera();
    mocks.records.push({
      id: 'fourth-record',
      instrumentId: 'historical-fourth',
      data: { patient_code: 'TH-01-01', study_visit: 'V4', visit_date: '2025-02-28' }
    });
    renderForm();
    expect(screen.queryByRole('option', { name: 'TH-01-01' })).toBeNull();
    expect(screen.queryByTestId('renderer')).toBeNull();
  });
  it.each(['V3', 'V4'] as const)('does not offer a patient for %s until every previous visit is saved', (visit) => {
    prepareThera(visit);
    mocks.records.push({
      id: 'first-record',
      instrumentId: 'first',
      data: { patient_code: 'TH-01-01', study_visit: 'V1', visit_date: '2024-02-29' }
    });
    if (visit === 'V4')
      mocks.records.push({
        id: 'second-record',
        instrumentId: 'historical-second',
        data: { patient_code: 'TH-01-01', study_visit: 'V2', visit_date: '2024-05-29' }
      });
    const view = renderForm();
    expect(screen.queryByRole('option', { name: 'TH-01-01' })).toBeNull();
    expect(screen.queryByTestId('renderer')).toBeNull();
    view.unmount();
    mocks.records.push({
      id: 'missing-record',
      instrumentId: 'historical-predecessor',
      data: {
        patient_code: 'TH-01-01',
        study_visit: visit === 'V3' ? 'V2' : 'V3',
        visit_date: visit === 'V3' ? '2024-05-29' : '2024-08-29'
      }
    });
    renderForm();
    expect(screen.getByTestId('renderer')).toBeDefined();
    expect(mocks.renderedBundle).toContain('"TH-01-01":"TH-01-01"');
  });
  it('still opens an existing visit for editing after the fourth visit has been saved', async () => {
    prepareThera();
    mocks.search = { recordId: 'first-record' };
    mocks.state.recordSubjectId = 'historical-investigator-subject';
    mocks.state.initialData = {
      patient_code: 'TH-01-01',
      baseline_date: '2024-01-31',
      visit_date: '2024-02-29'
    };
    mocks.records.push({
      id: 'fourth-record',
      instrumentId: 'historical-fourth',
      data: { patient_code: 'TH-01-01', study_visit: 'V4', visit_date: '2025-02-28' }
    });
    renderForm();
    await screen.findByTestId('renderer');
    expect(mocks.renderedInitialData?.patient_code).toBe('TH-01-01');
    expect(mocks.renderedInitialData?.visit_date).toBe('2024-02-29');
    expect(mocks.recordRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { groupId: 'group', subjectId: 'historical-investigator-subject' }
      })
    );
  });
  it('loads the actual V1 date for V2 and never carries answers to another patient', async () => {
    prepareThera('V2');
    mocks.records.push(
      { id: 'first-record', instrumentId: 'first', data: { patient_code: 'TH-01-01', visit_date: '2024-02-29' } },
      {
        id: 'other-baseline',
        instrumentId: 'baseline',
        data: { ...baselineData, patient_code: 'TH-01-02', visit_date: '2024-02-01' }
      },
      { id: 'other-first', instrumentId: 'first', data: { patient_code: 'TH-01-02', visit_date: '2024-03-03' } }
    );
    mocks.state.initialData = { patient_code: 'TH-01-01', eva_dryness: 8, baseline_date: 'forged' };
    renderForm();
    await screen.findByTestId('renderer');
    expect(mocks.renderedInitialData?.baseline_date).toBe('2024-01-31');
    expect(mocks.renderedInitialData?.first_visit_date).toBe('2024-02-29');
    act(() => mocks.change?.({ patient_code: 'TH-01-02' }));
    expect(mocks.renderedInitialData?.first_visit_date).toBe('2024-03-03');
    expect(mocks.renderedInitialData?.eva_dryness).toBeUndefined();
  });

  it.each(['2024-02-21', '2024-03-08'])('redirects direct access outside the real visit window on %s', (today) => {
    prepareThera();
    vi.setSystemTime(new Date(`${today}T12:00:00Z`));
    renderForm();
    expect(screen.queryByTestId('renderer')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/instruments/accessible-instruments' });
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
  });
});

describe('hospital options in published OMEGA forms', () => {
  type HospitalField = {
    options: { [key: string]: string };
    render: (data: { informed_consent: string }) => HospitalField | null;
  };
  type EvaluatedForm = { content: { fields: { [key: string]: HospitalField } }[] };

  function prepareOmega() {
    mocks.bundle.internal.name = 'ESTUDI_OSTEOPOROSIS';
    mocks.bundle.bundle = `Promise.resolve({
      content: [{ fields: {
        CAP: {
          kind: 'dynamic',
          deps: ['informed_consent'],
          render(data) {
            return data.informed_consent === 'si'
              ? { kind: 'string', variant: 'select', options: { 'CS Ávila Norte': 'CS Ávila Norte', 'Centre OMEGA': 'Centre OMEGA' } }
              : null;
          }
        },
        treatment: { kind: 'string', variant: 'select', options: { no: 'No' } }
      } }]
    })`;
    mocks.store.currentGroup = { hospitals: ['Centre OMEGA'], id: 'omega', name: 'OMEGA' };
  }

  async function evaluateForm(): Promise<EvaluatedForm> {
    return await (runInNewContext(mocks.renderedBundle, mocks.bundleContext) as Promise<EvaluatedForm>);
  }

  it('replaces a legacy fixed list with only the current study hospitals and preserves consent', async () => {
    prepareOmega();
    renderForm();
    const form = await evaluateForm();
    const fields = form.content[0]!.fields;
    expect(fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({ 'Centre OMEGA': 'Centre OMEGA' });
    expect(fields.CAP!.render({ informed_consent: 'no' })).toBeNull();
    expect(fields.treatment!.options).toEqual({ no: 'No' });
  });

  it('does not fall back to the legacy list when the study has no hospitals', async () => {
    prepareOmega();
    mocks.store.currentGroup.hospitals = [];
    renderForm();
    const form = await evaluateForm();
    expect(form.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({});
  });

  it('keeps the assigned hospital restriction within the current group', async () => {
    prepareOmega();
    Object.assign(mocks.store.currentGroup, {
      hospitalCatalog: [
        { id: 'centre', isInternal: false, name: 'Centre OMEGA' },
        { id: 'other', isInternal: false, name: 'Altre centre OMEGA' }
      ],
      hospitalIds: ['centre', 'other'],
      hospitals: ['Centre OMEGA', 'Altre centre OMEGA']
    });
    mocks.store.currentUser.studyHospitals = [
      { groupId: 'omega', hospitalId: 'centre' },
      { groupId: 'orion', hospitalId: 'other-study-centre' }
    ];
    renderForm();
    const form = await evaluateForm();
    expect(form.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
      'Centre OMEGA': 'Centre OMEGA'
    });
  });

  it('does not add an out-of-group hospital from an existing record to the options', async () => {
    prepareOmega();
    mocks.search = { recordId: 'existing-record' };
    mocks.state = { initialData: { CAP: 'CS Ávila Norte' } };
    renderForm();
    const form = await evaluateForm();
    expect(form.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
      'Centre OMEGA': 'Centre OMEGA'
    });
  });

  it.each([undefined, 'existing-record'])(
    'preserves a reconciled hospital alias in a draft or record (%s)',
    async (recordId) => {
      prepareOmega();
      mocks.search = { recordId };
      mocks.state = { initialData: { CAP: 'CS Ávila Norte' } };
      mocks.store.currentGroup = {
        hospitalCatalog: [
          {
            aliasKeys: ['cs avila norte'],
            id: 'avila',
            isInternal: false,
            name: 'CS Ávila Norte (Ávila)'
          }
        ],
        hospitalIds: ['avila'],
        hospitals: ['CS Ávila Norte (Ávila)'],
        id: 'omega',
        name: 'OMEGA'
      };
      mocks.store.currentUser.studyHospitals = [{ groupId: 'omega', hospitalId: 'avila' }];
      renderForm();
      const form = await evaluateForm();
      expect(form.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
        'CS Ávila Norte': 'CS Ávila Norte'
      });
      expect(mocks.renderedInitialData?.CAP).toBe('CS Ávila Norte');
    }
  );

  it('retains a historical centre when the investigator now has a different centre in the same study', async () => {
    prepareOmega();
    mocks.search = { recordId: 'historical-record' };
    mocks.state = { initialData: { CAP: 'CS Ávila Norte' } };
    mocks.store.currentGroup = {
      hospitalCatalog: [
        { id: 'current', isInternal: false, name: 'Centre OMEGA' },
        { aliasKeys: ['cs avila norte'], id: 'avila', isInternal: false, name: 'CS Ávila Norte (Ávila)' }
      ],
      hospitalIds: ['current', 'avila'],
      hospitals: ['Centre OMEGA', 'CS Ávila Norte (Ávila)'],
      id: 'omega',
      name: 'OMEGA'
    };
    mocks.store.currentUser.studyHospitals = [{ groupId: 'omega', hospitalId: 'current' }];
    renderForm();
    const form = await evaluateForm();
    expect(form.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
      'Centre OMEGA': 'Centre OMEGA',
      'CS Ávila Norte': 'CS Ávila Norte'
    });
    expect(mocks.renderedInitialData?.CAP).toBe('CS Ávila Norte');
  });

  it('captures each group list instead of sharing the last evaluated global list', async () => {
    prepareOmega();
    const view = renderForm();
    const omega = await evaluateForm();
    mocks.store.currentGroup = { hospitals: ['Centre ORION'], id: 'orion', name: 'ORION' };
    view.rerender(
      <QueryClientProvider client={client}>
        <Component />
      </QueryClientProvider>
    );
    const orion = await evaluateForm();
    expect(orion.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
      'Centre ORION': 'Centre ORION'
    });
    expect(omega.content[0]!.fields.CAP!.render({ informed_consent: 'si' })?.options).toEqual({
      'Centre OMEGA': 'Centre OMEGA'
    });
  });
});

describe('ORION selection submission date window', () => {
  function prepareSubmission(selectionDate: string, consentDate: string) {
    const data: Parameters<InstrumentSubmitHandler>[0]['data'] = {
      patient_code: 'OR-01-01',
      informed_consent: 'si',
      selection_visit_date: selectionDate,
      consent_signed_date: consentDate,
      age: 50
    };
    for (let criterion = 1; criterion <= 6; criterion++) {
      data[`inclusion_${criterion}`] = 'si';
      data[`exclusion_${criterion}`] = 'no';
    }

    localStorage.setItem('instrument-draft:selection:investigator', serializeInstrumentDraft(data));
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    renderForm();
    const submit = mocks.submit;
    if (!submit) {
      throw new Error('The instrument submit handler was not rendered');
    }
    return () => submit({ data, instrumentId: 'selection' });
  }

  it('shows the saved server code rather than a stale concurrent preview', async () => {
    const submit = prepareSubmission('15-12-2026', '15-12-2026');
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { id: 'record', data: { patient_code: 'OR-01-02' } } });
    await act(async () => {
      await submit();
    });
    expect(screen.getByRole('status').textContent).toContain('OR-01-02');
  });

  it('shows one submission failure, retains the draft and does not mark the form saved', async () => {
    const submit = prepareSubmission('15-12-2026', '15-12-2026');
    const error = { isAxiosError: true, response: { status: 404, data: { message: 'Session unavailable' } } };
    vi.mocked(axios.post).mockRejectedValueOnce(error);
    await expect(submit()).rejects.toBe(error);
    expect(mocks.notification).toHaveBeenCalledTimes(1);
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Session unavailable' })
    );
    expect(mocks.store.setIsCurrentSessionSubmitted).not.toHaveBeenCalled();
    expect(localStorage.getItem('instrument-draft:selection:investigator')).not.toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it('discards pre-reset ORION test drafts without touching OMEGA drafts', async () => {
    localStorage.setItem(
      'instrument-draft:selection:investigator',
      serializeInstrumentDraft({ patient_code: 'OR-99-99' })
    );
    localStorage.setItem('instrument-draft:omega:investigator', 'preserve-omega-draft');
    Object.assign(mocks.store.currentGroup, { studyCode: 'OR', dataResetAt: new Date('2026-10-30') });
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 'OR-01-01' } });
    renderForm();
    await waitFor(() => expect(screen.getByTestId('renderer').textContent).toBe(''));
    expect(localStorage.getItem('instrument-draft:selection:investigator')).toBeNull();
    expect(localStorage.getItem('instrument-draft:omega:investigator')).toBe('preserve-omega-draft');
  });

  it.each(['01-11-2026', '30-11-2026', '15-12-2026', '31-12-2027'])(
    'saves a selection with visit and consent on %s',
    async (date) => {
      const submit = prepareSubmission(date, date);
      await act(async () => {
        await submit();
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/v1/instrument-records',
        expect.objectContaining({
          data: expect.objectContaining({ selection_visit_date: date, consent_signed_date: date })
        }),
        { suppressErrorNotification: true }
      );
      expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
      expect(mocks.store.setIsCurrentSessionSubmitted).toHaveBeenCalledWith(true);
    }
  );

  it.each([
    ['31-10-2026', '31-10-2026'],
    ['01-11-2026', '31-10-2026'],
    ['01-01-2028', '31-12-2027'],
    ['31-12-2027', '01-01-2028']
  ])('rejects dates outside the window before saving: visit %s, consent %s', async (visit, consent) => {
    const submit = prepareSubmission(visit, consent);
    await expect(submit()).rejects.toThrow('entre noviembre de 2026 y diciembre de 2027');
    expect(axios.post).not.toHaveBeenCalled();
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: expect.stringContaining('entre noviembre de 2026') })
    );
    expect(localStorage.getItem('instrument-draft:selection:investigator')).not.toBeNull();
  });

  it('still rejects consent after the November visit without clearing the draft', async () => {
    const submit = prepareSubmission('01-11-2026', '02-11-2026');
    await expect(submit()).rejects.toThrow('La firma del consentimiento no puede ser posterior');
    expect(axios.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('instrument-draft:selection:investigator')).not.toBeNull();
  });

  it('preserves multi-select values recovered from earlier form pages on the JSON wire', async () => {
    const submit = prepareSubmission('15-12-2026', '15-12-2026');
    const change = mocks.change;
    if (!change) {
      throw new Error('The instrument data change handler was not rendered');
    }
    act(() => {
      change(selectionData());
    });

    await act(async () => {
      await submit();
    });

    const request = vi.mocked(axios.post).mock.calls.find(([url]) => url === '/v1/instrument-records');
    if (!request) {
      throw new Error('The instrument record was not submitted');
    }
    const wireJson = JSON.stringify(request[1]);
    const body = JSON.parse(wireJson) as {
      data: { adverse_event_records: { seriousness: unknown }[] };
    };
    expect(body.data.adverse_event_records[0]?.seriousness).toEqual({
      __deserializedType: 'Set',
      __isSerializedType: true,
      value: ['no_grave']
    });
    const received = JSON.parse(wireJson, reviver) as { data: unknown };
    expect(selectionSchema.safeParse(received.data).success).toBe(true);
  });

  it('does not alter multi-select values already serialized by the renderer', async () => {
    prepareSubmission('15-12-2026', '15-12-2026');
    const data = JSON.parse(
      JSON.stringify(selectionData(), replacer)
    ) as Parameters<InstrumentSubmitHandler>[0]['data'];
    const submit = mocks.submit;
    if (!submit) {
      throw new Error('The instrument submit handler was not rendered');
    }

    await act(async () => {
      await submit({ data, instrumentId: 'selection' });
    });

    const request = vi.mocked(axios.post).mock.calls.find(([url]) => url === '/v1/instrument-records');
    if (!request) {
      throw new Error('The instrument record was not submitted');
    }
    expect(request[1]).toEqual(expect.objectContaining({ data }));
    const received = JSON.parse(JSON.stringify(request[1]), reviver) as { data: unknown };
    expect(selectionSchema.safeParse(received.data).success).toBe(true);
  });

  it('keeps the draft and never marks a rejected record as submitted', async () => {
    const submit = prepareSubmission('15-12-2026', '15-12-2026');
    const failure = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          issues: [{ path: ['adverse_event_records', 0, 'seriousness'], message: 'Expected set, received object' }]
        }
      }
    };
    vi.mocked(axios.post).mockRejectedValue(failure);
    await expect(submit()).rejects.toBe(failure);
    expect(localStorage.getItem('instrument-draft:selection:investigator')).not.toBeNull();
    expect(mocks.store.setIsCurrentSessionSubmitted).not.toHaveBeenCalled();
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Expected set, received object' })
    );
    expect(mocks.notification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('does not resurrect a hidden adverse-event row from cumulative snapshots when submitting No', async () => {
    const data = { ...selectionData(), baseline_adverse_events: 'no' };
    delete data.adverse_event_records;
    localStorage.setItem('instrument-draft:selection:investigator', serializeInstrumentDraft(data));
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    renderForm();
    const change = mocks.change;
    const submit = mocks.submit;
    if (!change || !submit) throw new Error('Instrument handlers unavailable');
    act(() => change({ ...selectionData(), adverse_event_records: [{ seriousness: new Set() }] }));
    await act(async () => {
      await submit({ data, instrumentId: 'selection' });
    });
    const request = vi.mocked(axios.post).mock.calls.find(([url]) => url === '/v1/instrument-records');
    expect(request?.[1].data).not.toHaveProperty('adverse_event_records');
    const received = JSON.parse(JSON.stringify(request?.[1]), reviver) as { data: unknown };
    expect(selectionSchema.safeParse(received.data).success).toBe(true);
  });

  it('drops hidden adverse events from the edit payload when changing the answer to No', async () => {
    mocks.search = { recordId: 'existing-record' };
    mocks.state = { initialData: selectionData() };
    vi.mocked(axios.patch).mockResolvedValue({ data: {} });
    renderForm();
    const change = mocks.change;
    const submit = mocks.submit;
    if (!change || !submit) throw new Error('Instrument handlers unavailable');
    act(() => change(selectionData()));
    const data = { ...selectionData(), baseline_adverse_events: 'no' };
    delete data.adverse_event_records;
    await act(async () => {
      await submit({ data, instrumentId: 'selection' });
    });
    fireEvent.click(screen.getByText('Confirmar i desar'));
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(axios.patch).mock.calls[0]?.[1].data).not.toHaveProperty('adverse_event_records');
  });

  it('preserves earlier-page multi-select answers when confirming an edit', async () => {
    mocks.search = { recordId: 'existing-record' };
    mocks.state = { initialData: selectionData() };
    vi.mocked(axios.patch).mockResolvedValue({ data: {} });
    renderForm();
    const change = mocks.change;
    const submit = mocks.submit;
    if (!change || !submit) {
      throw new Error('The instrument handlers were not rendered');
    }
    act(() => {
      change(selectionData());
    });
    const incompleteData = selectionData();
    delete incompleteData.adverse_event_records;
    const serialized = JSON.parse(
      JSON.stringify(incompleteData, replacer)
    ) as Parameters<InstrumentSubmitHandler>[0]['data'];
    await act(async () => {
      await submit({ data: serialized, instrumentId: 'selection' });
    });
    expect(axios.patch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirmar i desar'));
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1));
    const [url, payload] = vi.mocked(axios.patch).mock.calls[0]!;
    expect(url).toBe('/v1/instrument-records/existing-record');
    const received = JSON.parse(JSON.stringify(payload), reviver) as { data: unknown };
    expect(selectionSchema.safeParse(received.data).success).toBe(true);
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

describe('ORION manual patient codes and draft recovery', () => {
  it('opens an incomplete draft without requesting a generated code', async () => {
    const draft = serializeInstrumentDraft({ age: 50, informed_consent: 'si' });
    localStorage.setItem('instrument-draft:selection:investigator', draft);
    vi.mocked(axios.post).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: 'Assign a hospital to the investigator before creating an ORION patient code' }
      }
    });
    renderForm();
    await screen.findByTestId('renderer');
    expect(screen.queryByTestId('spinner')).toBeNull();
    expect(mocks.renderedInitialData?.patient_code).toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('instrument-draft:selection:investigator')).toBe(draft);
  });

  it('passes the existing draft to the renderer without an allocation dependency', async () => {
    localStorage.setItem('instrument-draft:selection:investigator', serializeInstrumentDraft({ age: 50 }));
    vi.mocked(axios.post)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ data: { code: 'OR-01-01' } });
    renderForm();
    await screen.findByTestId('renderer');
    expect(mocks.renderedInitialData?.age).toBe(50);
    expect(axios.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('instrument-draft:selection:investigator')).toContain('50');
  });

  it('restores a draft with a patient code without requesting a new code', async () => {
    localStorage.setItem(
      'instrument-draft:selection:investigator',
      serializeInstrumentDraft({ patient_code: 'OR-01-02', age: 50 })
    );
    renderForm();
    await waitFor(() => expect(screen.getByTestId('renderer').textContent).toBe('OR-01-02'));
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('opens a saved record without requesting a new patient code', () => {
    mocks.search = { recordId: 'existing-record' };
    mocks.state = { initialData: { patient_code: 'OR-01-03', age: 50 } };
    renderForm();
    expect(screen.getByTestId('renderer').textContent).toBe('OR-01-03');
    expect(axios.post).not.toHaveBeenCalled();
  });
});
