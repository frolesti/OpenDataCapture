import { StrictMode } from 'react';
import type { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeInstrumentDraft } from '../../utils/instrument-draft';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  notification: vi.fn(),
  search: {} as { recordId?: string },
  state: {} as { initialData?: Record<string, unknown> },
  bundle: {
    id: 'selection',
    kind: 'FORM',
    internal: { name: 'ORION_PR_2026_SELECTION' },
    bundle: '({})'
  },
  store: {
    currentGroup: { id: 'group', name: 'ORION', hospitals: [] },
    currentSession: { id: 'session', subject: { id: 'subject' } },
    currentUser: { id: 'investigator', username: 'investigator', basePermissionLevel: 'STANDARD' }
  }
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: (error: unknown) => Boolean(error && typeof error === 'object' && 'isAxiosError' in error)
  }
}));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useNotificationsStore: () => ({ addNotification: mocks.notification }),
  useTranslation: () => ({ t: (value: { en: string }) => value.en })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => ({
  Button: ({ children, ...props }: PropsWithChildren) => <button {...props}>{children}</button>,
  Heading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
  Spinner: () => <div data-testid="spinner" />,
  Dialog: Object.assign(() => null, { Content: () => null })
}));
vi.mock('@opendatacapture/react-core', () => ({
  InstrumentRenderer: ({ initialData }: { initialData?: Record<string, unknown> }) => (
    <div data-testid="renderer">{String(initialData?.patient_code ?? '')}</div>
  )
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
  localStorage.clear();
  vi.resetAllMocks();
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
