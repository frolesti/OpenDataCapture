import type { ComponentType, PropsWithChildren, ReactNode } from 'react';

import type { Group, UpdateGroupData } from '@opendatacapture/schemas/group';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod/v4';

type Values = { accessibleFormInstrumentIds: Set<string>; name: string; studyCode: 'GENERAL' | 'OR' | 'TH' };
type FormProps = {
  additionalButtons: { left: ReactNode; right: ReactNode };
  initialValues: Values;
  onSubmit: (data: Values) => Promise<void>;
  subscribe: { onChange: (data: Values) => void; selector: (data: Values) => string };
  validationSchema: z.ZodType;
};
const mocks = vi.hoisted(() => ({
  component: undefined as ComponentType | undefined,
  form: undefined as FormProps | undefined,
  groups: [
    {
      id: 'thera',
      name: 'THERA-SGM-2026',
      studyCode: null,
      accessibleInstrumentIds: ['baseline', 'interactive'],
      hospitals: ['Alta Medical Services']
    }
  ],
  instruments: [
    { id: 'baseline', kind: 'FORM', details: { title: 'Visita basal' } },
    { id: 'interactive', kind: 'INTERACTIVE', details: { title: 'Interactive' } }
  ],
  update: vi.fn<(input: { id: string; data: UpdateGroupData }) => Promise<void>>()
}));

vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: string | { en: string }) => (typeof value === 'string' ? value : value.en) })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  const Dialog = Object.assign(Container, {
    Content: Container,
    Header: Container,
    Title: Container,
    Description: Container,
    Body: Container,
    Footer: Container,
    Cancel: Container,
    Action: Container
  });
  return {
    AlertDialog: Dialog,
    Sheet: Dialog,
    Heading: Container,
    SearchBar: () => null,
    Button: ({ children, disabled, onClick }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => (
      <button disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    ClientTable: ({ data, onEntryClick }: { data: Group[]; onEntryClick: (group: Group) => void }) => (
      <button onClick={() => onEntryClick(data[0]!)}>Editar grup</button>
    ),
    Form: (props: FormProps) => {
      mocks.form = props;
      return (
        <div>
          {props.additionalButtons.left}
          {props.additionalButtons.right}
        </div>
      );
    }
  };
});
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    mocks.component = options.component;
    return options;
  },
  Link: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/components/admin/groups/GroupHospitalManager', () => ({ GroupHospitalManager: () => null }));
vi.mock('@/hooks/useGroupsQuery', () => ({
  groupsQueryOptions: vi.fn(),
  useGroupsQuery: () => ({ data: mocks.groups })
}));
vi.mock('@/hooks/useInstrumentInfoQuery', () => ({ useInstrumentInfoQuery: () => ({ data: mocks.instruments }) }));
vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => ({ filteredData: mocks.groups, searchTerm: '', setSearchTerm: vi.fn() })
}));
vi.mock('@/hooks/useDeleteGroupMutation', () => ({ useDeleteGroupMutation: () => ({ mutate: vi.fn() }) }));
vi.mock('@/hooks/useRenameHospitalMutation', () => ({ useRenameHospitalMutation: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useUpdateGroupByIdMutation', () => ({
  useUpdateGroupByIdMutation: () => ({ mutateAsync: mocks.update })
}));

import '../../routes/_app/admin/groups/index';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue(undefined);
});

describe('editing a legacy group study', () => {
  it('detects a study-only change and sends it without losing hospitals or interactive instruments', async () => {
    const Component = mocks.component!;
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar grup' }));
    expect(mocks.form?.initialValues.studyCode).toBe('GENERAL');
    expect(screen.getByRole('button', { name: 'core.save' }).hasAttribute('disabled')).toBe(true);
    const values: Values = { ...mocks.form!.initialValues, studyCode: 'TH' };
    expect(mocks.form!.validationSchema.safeParse(values).success).toBe(true);
    expect(mocks.form!.subscribe.selector(values)).not.toBe(mocks.form!.subscribe.selector(mocks.form!.initialValues));
    act(() => mocks.form!.subscribe.onChange(values));
    expect(screen.getByRole('button', { name: 'core.save' }).hasAttribute('disabled')).toBe(false);
    await act(async () => mocks.form!.onSubmit(values));
    expect(mocks.update).toHaveBeenCalledWith({
      id: 'thera',
      data: {
        accessibleInstrumentIds: ['baseline', 'interactive'],
        hospitals: ['Alta Medical Services'],
        name: 'THERA-SGM-2026',
        studyCode: 'TH'
      }
    });
  });
});
