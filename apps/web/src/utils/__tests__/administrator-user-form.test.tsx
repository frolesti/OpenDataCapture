import type { ComponentType, InputHTMLAttributes, PropsWithChildren } from 'react';

import type { UpdateUserData } from '@opendatacapture/schemas/user';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  component: undefined as ComponentType | undefined,
  mutate: vi.fn(),
  updateUser: vi.fn<(input: { id: string; data: UpdateUserData }) => Promise<void>>(),
  groups: [{ id: 'thera', name: 'THERA-SGM-2026', hospitals: ['Alta Medical Services'] }],
  users: [
    {
      id: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      basePermissionLevel: 'ADMIN',
      groupIds: [],
      studyHospitals: [],
      createdAt: new Date('2026-01-01')
    }
  ]
}));

vi.mock('@douglasneuroinformatics/libpasswd', () => ({ estimatePasswordStrength: () => ({ success: true }) }));
vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: string | { en: string }) => (typeof value === 'string' ? value : value.en) })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => {
  const Wrapper = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Dialog = Object.assign(
    ({ children, open }: PropsWithChildren<{ open: boolean }>) =>
      open ? <section role="dialog">{children}</section> : null,
    {
      Content: Wrapper,
      Description: Wrapper,
      Footer: Wrapper,
      Header: Wrapper,
      Title: Wrapper,
      Action: Wrapper,
      Cancel: Wrapper
    }
  );
  const DropdownMenu = Object.assign(() => null, { Trigger: Wrapper, Content: Wrapper, Item: Wrapper });
  const Table = Object.assign(({ children }: PropsWithChildren) => <table>{children}</table>, {
    Body: ({ children }: PropsWithChildren) => <tbody>{children}</tbody>,
    Cell: ({ children }: PropsWithChildren) => <td>{children}</td>,
    Head: ({ children }: PropsWithChildren) => <th>{children}</th>,
    Header: ({ children }: PropsWithChildren) => <thead>{children}</thead>,
    Row: ({ children, onClick }: PropsWithChildren<{ onClick?: () => void }>) => <tr onClick={onClick}>{children}</tr>
  });
  const Select = Object.assign(
    ({
      children,
      value,
      onValueChange
    }: PropsWithChildren<{ value: string; onValueChange: (value: string) => void }>) => (
      <select value={value} onChange={(event) => onValueChange(event.target.value)}>
        {children}
      </select>
    ),
    {
      Trigger: () => null,
      Value: () => null,
      Content: ({ children }: PropsWithChildren) => <>{children}</>,
      Item: ({ children, value }: PropsWithChildren<{ value: string }>) => <option value={value}>{children}</option>
    }
  );
  return {
    AlertDialog: Dialog,
    Dialog,
    DropdownMenu,
    Table,
    Select,
    Button: ({ children, onClick, disabled }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    Checkbox: ({
      checked,
      disabled,
      onCheckedChange
    }: {
      checked: boolean;
      disabled?: boolean;
      onCheckedChange: () => void;
    }) => <input type="checkbox" checked={checked} disabled={disabled} onChange={onCheckedChange} />,
    Heading: Wrapper,
    Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: ({ children, htmlFor }: PropsWithChildren<{ htmlFor?: string }>) => (
      <label htmlFor={htmlFor}>{children}</label>
    ),
    SearchBar: () => null
  };
});
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    mocks.component = options.component;
    return options;
  }
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/components/admin/ProfessionalTitleField', () => ({ ProfessionalTitleField: () => null }));
vi.mock('@/hooks/useGroupsQuery', () => ({ useGroupsQuery: () => ({ data: mocks.groups }), groupsQueryOptions: {} }));
vi.mock('@/hooks/useUsersQuery', () => ({ useUsersQuery: () => ({ data: mocks.users }), usersQueryOptions: {} }));
vi.mock('@/hooks/useSessionsQuery', () => ({ useSessionsQuery: () => ({ data: [] }) }));
vi.mock('@/hooks/usePendingInvestigatorsQuery', () => ({
  usePendingInvestigatorsQuery: () => ({ data: [] }),
  pendingInvestigatorsQueryOptions: {}
}));
vi.mock('@/hooks/useCreateUserMutation', () => ({ useCreateUserMutation: () => ({ mutateAsync: mocks.mutate }) }));
vi.mock('@/hooks/useCreatePendingInvestigatorMutation', () => ({
  useCreatePendingInvestigatorMutation: () => ({ mutateAsync: mocks.mutate })
}));
vi.mock('@/hooks/useDeleteUserMutation', () => ({ useDeleteUserMutation: () => ({ mutateAsync: mocks.mutate }) }));
vi.mock('@/hooks/useDeletePendingInvestigatorMutation', () => ({
  useDeletePendingInvestigatorMutation: () => ({ mutateAsync: mocks.mutate })
}));
vi.mock('@/hooks/usePromotePendingInvestigatorMutation', () => ({
  usePromotePendingInvestigatorMutation: () => ({ mutateAsync: mocks.mutate })
}));
vi.mock('@/hooks/useUpdateGroupByIdMutation', () => ({
  useUpdateGroupByIdMutation: () => ({ mutateAsync: mocks.mutate })
}));
vi.mock('@/hooks/useUpdatePendingInvestigatorMutation', () => ({
  useUpdatePendingInvestigatorMutation: () => ({ mutateAsync: mocks.mutate })
}));
vi.mock('@/hooks/useUpdateUserMutation', () => ({ useUpdateUserMutation: () => ({ mutateAsync: mocks.updateUser }) }));
vi.mock('@/store', () => ({
  useAppStore: (selector: (store: { currentUser: (typeof mocks.users)[0] }) => unknown) =>
    selector({ currentUser: mocks.users[0]! })
}));

import '../../routes/_app/admin/users/create';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateUser.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('administrator user editing', () => {
  it('shows all studies as automatic non-editable memberships and explains the default centre', () => {
    const Component = mocks.component!;
    render(<Component />);
    fireEvent.click(screen.getByText('Admin User'));
    const dialog = within(screen.getByRole('dialog'));
    const study = dialog.getByRole('checkbox', { name: 'THERA-SGM-2026' });
    expect(study).toHaveProperty('checked', true);
    expect(study).toHaveProperty('disabled', true);
    expect(dialog.getByText(/Alta Medical Services/)).toBeDefined();
  });

  it('saves administrator profile changes without sending manual group or hospital assignments', async () => {
    const Component = mocks.component!;
    render(<Component />);
    fireEvent.click(screen.getByText('Admin User'));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'core.save' }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledOnce());
    expect(mocks.updateUser).toHaveBeenCalledWith({
      id: 'admin',
      data: expect.objectContaining({ groupIds: undefined, studyHospitals: undefined, hospital: undefined })
    });
  });
});
