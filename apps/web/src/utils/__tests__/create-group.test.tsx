import type { ComponentType, PropsWithChildren } from 'react';

import type { CreateGroupData } from '@opendatacapture/schemas/group';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FormData = { accessibleInstrumentIds: Set<string>; name: string; studyCode: 'GENERAL' | 'OR' | 'TH' };
type FormProps = {
  additionalButtons: { right: React.ReactNode };
  content: { accessibleInstrumentIds: { options: { [key: string]: string } } };
  fieldsFooter: React.ReactNode;
  initialValues: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  subscribe: { onChange: (data: FormData) => void };
};
const mocks = vi.hoisted(() => ({
  component: undefined as ComponentType | undefined,
  form: undefined as FormProps | undefined,
  hospitals: [] as string[],
  mutateAsync: vi.fn<(input: { data: CreateGroupData }) => Promise<void>>(),
  navigate: vi.fn(),
  refetch: vi.fn(),
  query: {
    data: [{ id: 'thera-v0', details: { title: 'THERA · Visita basal' } }],
    isError: false,
    isSuccess: true
  }
}));

vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: string | { en: string }) => (typeof value === 'string' ? value : value.en) })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => ({
  Button: ({ children, variant: _variant, ...props }: PropsWithChildren<{ variant?: string }>) => (
    <button {...props}>{children}</button>
  ),
  Heading: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
  Form: (props: FormProps) => {
    mocks.form = props;
    return (
      <div>
        {props.fieldsFooter}
        {props.additionalButtons.right}
      </div>
    );
  }
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: ComponentType }) => {
    mocks.component = options.component;
    return options;
  },
  Link: ({ children }: PropsWithChildren) => <span>{children}</span>,
  useNavigate: () => mocks.navigate
}));
vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ children }: PropsWithChildren) => <header>{children}</header>
}));
vi.mock('@/components/admin/groups/GroupHospitalManager', () => ({
  GroupHospitalManager: ({ hospitals }: { hospitals: string[] }) => {
    mocks.hospitals = hospitals;
    return <div>{hospitals.join(', ')}</div>;
  }
}));
vi.mock('@/hooks/useGroupsQuery', () => ({ useGroupsQuery: () => ({ data: [] }) }));
vi.mock('@/hooks/useInstrumentInfoQuery', () => ({
  useInstrumentInfoQuery: () => ({ ...mocks.query, refetch: mocks.refetch })
}));
vi.mock('@/hooks/useCreateGroupMutation', () => ({
  useCreateGroupMutation: () => ({ isPending: false, mutateAsync: mocks.mutateAsync })
}));

import '../../routes/_app/admin/groups/create';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.isError = false;
  mocks.query.isSuccess = true;
  mocks.mutateAsync.mockResolvedValue(undefined);
});

describe('group creation', () => {
  it('offers published instruments and preselects the internal hospital', () => {
    const Component = mocks.component!;
    render(<Component />);
    expect(mocks.form?.content.accessibleInstrumentIds.options).toEqual({ 'thera-v0': 'THERA · Visita basal' });
    expect(mocks.form?.initialValues.accessibleInstrumentIds).toEqual(new Set());
    expect(mocks.hospitals).toEqual(['Alta Medical Services']);
  });

  it('submits the chosen instruments on the first creation request', async () => {
    const Component = mocks.component!;
    render(<Component />);
    await act(async () => {
      await mocks.form!.onSubmit({ name: 'THERA', accessibleInstrumentIds: new Set(['thera-v0']), studyCode: 'TH' });
    });
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      data: {
        accessibleInstrumentIds: ['thera-v0'],
        hospitals: ['Alta Medical Services'],
        name: 'THERA',
        studyCode: 'TH',
        type: 'CLINICAL'
      }
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '..' });
  });

  it('blocks submission and offers a retry when instruments fail to load', () => {
    mocks.query.isError = true;
    mocks.query.isSuccess = false;
    const Component = mocks.component!;
    render(<Component />);
    act(() => mocks.form!.subscribe.onChange({ name: 'THERA', accessibleInstrumentIds: new Set(), studyCode: 'TH' }));
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: 'core.submit' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('creates a general group without a study-specific code', async () => {
    const Component = mocks.component!;
    render(<Component />);
    await act(async () => {
      await mocks.form!.onSubmit({ name: 'General', accessibleInstrumentIds: new Set(), studyCode: 'GENERAL' });
    });
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      data: expect.objectContaining({ accessibleInstrumentIds: [], studyCode: null })
    });
  });

  it('does not navigate away if creation fails', async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error('Creation failed'));
    const Component = mocks.component!;
    render(<Component />);
    await expect(
      mocks.form!.onSubmit({ name: 'THERA', accessibleInstrumentIds: new Set(['thera-v0']), studyCode: 'TH' })
    ).rejects.toThrow('Creation failed');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
