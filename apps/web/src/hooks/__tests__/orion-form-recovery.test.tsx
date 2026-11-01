import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';

import { replacer, reviver } from '@douglasneuroinformatics/libjs';
import type { InstrumentSubmitHandler } from '@opendatacapture/react-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeInstrumentDraft } from '../../utils/instrument-draft';
import { loadSchema, selectionData } from '../../utils/__tests__/orion-test-utils';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notification: vi.fn(),
  change: undefined as ((data: Record<string, unknown>) => void) | undefined,
  submit: undefined as InstrumentSubmitHandler | undefined,
  search: {} as { recordId?: string },
  state: {} as { initialData?: Record<string, unknown> },
  bundle: {
    id: 'selection',
    kind: 'FORM',
    internal: { name: 'ORION_PR_2026_SELECTION' },
    bundle: '({})'
  },
  store: {
    setIsCurrentSessionSubmitted: vi.fn(),
    startSession: vi.fn(),
    currentGroup: { id: 'group', name: 'ORION', hospitals: [] },
    currentSession: { id: 'session', subject: { id: 'subject' } },
    currentUser: { id: 'investigator', username: 'investigator', basePermissionLevel: 'STANDARD' }
  }
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
    onDataChange,
    onSubmit
  }: {
    initialData?: Record<string, unknown>;
    onDataChange?: (data: Record<string, unknown>) => void;
    onSubmit: InstrumentSubmitHandler;
  }) => {
    mocks.change = onDataChange;
    mocks.submit = onSubmit;
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
  useInstrumentInfoQuery: () => ({ data: [mocks.bundle] })
}));
vi.mock('@/hooks/useInstrumentRecords', () => ({
  useInstrumentRecords: () => ({ data: [], isLoading: false })
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
  client = new QueryClient();
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
  mocks.store.currentGroup = { id: 'group', name: 'ORION', hospitals: [] };
  localStorage.clear();
  vi.resetAllMocks();
  vi.mocked(axios.get).mockResolvedValue({ data: { groupId: 'group', subjectId: 'subject' } });
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
    await waitFor(() => expect(screen.getByTestId('renderer').textContent).toBe('OR-01-01'));
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
});

describe('ORION form recovery without an assigned hospital', () => {
  it('shows an actionable error instead of a spinner, preserves the draft and allows leaving', async () => {
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
    await screen.findByRole('alert');
    expect(screen.getByText(/Cal que un administrador assigni un hospital/)).toBeDefined();
    expect(screen.queryByTestId('spinner')).toBeNull();
    expect(screen.queryByTestId('renderer')).toBeNull();
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('instrument-draft:selection:investigator')).toBe(draft);
    fireEvent.click(screen.getByText('Torna als formularis'));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/instruments/accessible-instruments' });
  });

  it('recovers after an explicit retry and passes the existing draft to the renderer', async () => {
    localStorage.setItem('instrument-draft:selection:investigator', serializeInstrumentDraft({ age: 50 }));
    vi.mocked(axios.post)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ data: { code: 'OR-01-01' } });
    renderForm();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('Torna-ho a provar'));
    await waitFor(() => expect(screen.getByTestId('renderer').textContent).toBe('OR-01-01'));
    expect(axios.post).toHaveBeenCalledTimes(2);
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
