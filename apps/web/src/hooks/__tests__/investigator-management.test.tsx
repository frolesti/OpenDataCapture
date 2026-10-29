import { Suspense } from 'react';
import type { PropsWithChildren } from 'react';

import type { PendingInvestigator, UpdatePendingInvestigatorData, User } from '@opendatacapture/schemas/user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../services/i18n';

const mocks = vi.hoisted(() => ({
  notification: vi.fn(),
  pending: [] as PendingInvestigator[],
  users: [] as User[],
  groups: [{ id: 'group', name: 'Estudi de prova', hospitals: ['Hospital de prova'] }]
}));

vi.mock('axios', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
vi.mock('@douglasneuroinformatics/libui/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@douglasneuroinformatics/libui/hooks')>()),
  useNotificationsStore: (selector: (store: { addNotification: typeof mocks.notification }) => unknown) =>
    selector({ addNotification: mocks.notification }),
  useTranslation: () => ({
    t: (value: string | { en: string }) =>
      typeof value === 'string'
        ? ({ 'core.save': 'Desar', 'core.cancel': 'Cancel·lar', 'common.groups': 'Grups' }[value] ?? value)
        : value.en
  })
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: unknown }) => options
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/hooks/useGroupsQuery', () => ({
  useGroupsQuery: () => ({ data: mocks.groups }),
  groupsQueryOptions: vi.fn()
}));
vi.mock('@/hooks/useUsersQuery', () => ({
  USERS_QUERY_KEY: 'users',
  useUsersQuery: () => ({ data: mocks.users }),
  usersQueryOptions: vi.fn()
}));
vi.mock('@/hooks/useSessionsQuery', () => ({
  useSessionsQuery: () => ({ data: [] })
}));
vi.mock('@/store', () => ({
  useAppStore: (selector: (store: { currentUser: { username: string } }) => unknown) =>
    selector({ currentUser: { username: 'admin' } })
}));

import { Route } from '../../routes/_app/admin/users/create';

const Component = Route.component;
let client: QueryClient;

function pendingInvestigator(overrides: Partial<PendingInvestigator> = {}): PendingInvestigator {
  return {
    id: 'pending',
    createdAt: new Date('2026-10-29'),
    updatedAt: new Date('2026-10-29'),
    basePermissionLevel: 'STANDARD',
    email: 'doctor@example.test',
    firstName: 'Maria',
    lastName: 'Exemple',
    groupIds: ['group'],
    hospital: 'Hospital de prova',
    notes: 'Comentari inicial',
    professionalTitle: 'Dra',
    signed: false,
    status: 'PENDING',
    userType: 'INVESTIGATOR',
    ...overrides
  };
}

function renderDirectory() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['pending-investigators'], mocks.pending);
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback="Carregant">
        <Component />
      </Suspense>
    </QueryClientProvider>
  );
}

function openPendingEditor() {
  fireEvent.click(screen.getByRole('button', { name: 'Investigadors pendents' }));
  fireEvent.click(screen.getByText('doctor@example.test'));
  return within(screen.getByRole('dialog'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending = [pendingInvestigator()];
  mocks.users = [];
  vi.mocked(axios.get).mockImplementation(async () => ({ data: mocks.pending }));
  vi.mocked(axios.patch).mockImplementation(async (_url, data: UpdatePendingInvestigatorData) => {
    const serialized = JSON.parse(JSON.stringify(data)) as UpdatePendingInvestigatorData;
    mocks.pending = mocks.pending.map((entry) => ({ ...entry, ...serialized }));
    return { data: mocks.pending[0] };
  });
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('investigator comments in the actual user-management route', () => {
  it('saves an edited comment and restores it after closing and reopening the editor', async () => {
    renderDirectory();
    const dialog = openPendingEditor();
    fireEvent.change(dialog.getByLabelText('Comentaris'), { target: { value: 'Comentari actualitzat' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Desar' }));
    await waitFor(() => expect(mocks.pending[0]?.notes).toBe('Comentari actualitzat'));
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel·lar' }));
    fireEvent.click(screen.getByText('doctor@example.test'));
    expect((screen.getByLabelText('Comentaris') as HTMLTextAreaElement).value).toBe('Comentari actualitzat');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('explicitly clears existing comments when saving a blank field (%j)', async (value) => {
    renderDirectory();
    const dialog = openPendingEditor();
    fireEvent.change(dialog.getByLabelText('Comentaris'), { target: { value } });
    fireEvent.click(dialog.getByRole('button', { name: 'Desar' }));
    await waitFor(() => expect(mocks.pending[0]?.notes).toBeNull());
    expect(axios.patch).toHaveBeenCalledWith(
      '/v1/users/pending/pending',
      expect.objectContaining({ notes: null, signed: false })
    );
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel·lar' }));
    fireEvent.click(screen.getByText('doctor@example.test'));
    expect((screen.getByLabelText('Comentaris') as HTMLTextAreaElement).value).toBe('');
  });

  it('continues displaying the saved comments after promotion to an active investigator', () => {
    mocks.pending = [
      pendingInvestigator({ promotedUserId: 'active-user', promotedAt: new Date(), status: 'COMPLETED', signed: true })
    ];
    mocks.users = [
      {
        id: 'active-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        additionalPermissions: [],
        basePermissionLevel: 'STANDARD',
        email: 'doctor@example.test',
        firstName: 'Maria',
        lastName: 'Exemple',
        groupIds: ['group'],
        username: 'maria'
      }
    ];
    renderDirectory();
    expect(screen.getByText('Comentari inicial')).toBeDefined();
  });
});
