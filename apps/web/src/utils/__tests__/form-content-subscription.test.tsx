import type { PropsWithChildren } from 'react';

import type { AnyUnilingualFormInstrument } from '@opendatacapture/runtime-core';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v3';

import { FormContent } from '../../../../../packages/react-core/src/components/FormContent/FormContent';

const mocks = vi.hoisted(() => ({
  subscribe: undefined as
    | undefined
    | {
        selector: (values: { [key: string]: unknown }) => string;
        onChange: (values: { [key: string]: unknown }) => void;
      }
}));

vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: { en: string }) => value.en })
}));
vi.mock('@douglasneuroinformatics/libui/components', () => {
  const Container = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    Button: Container,
    Dialog: Object.assign(Container, {
      Trigger: Container,
      Content: Container,
      Header: Container,
      Title: Container,
      Body: Container
    }),
    Heading: Container,
    Form: ({ subscribe }: { subscribe: typeof mocks.subscribe }) => {
      mocks.subscribe = subscribe;
      return <div />;
    }
  };
});

describe('clinical form draft subscriptions', () => {
  it('detects changes between Set selections and preserves native values for draft serialization', () => {
    const instrument: AnyUnilingualFormInstrument = {
      __runtimeVersion: 1,
      kind: 'FORM',
      language: 'es',
      tags: [],
      internal: { edition: 1, name: 'THERA_SUBSCRIPTION_TEST' },
      details: { title: 'Test', description: 'Test', license: 'FREE-NOS' },
      content: {},
      measures: null,
      validationSchema: z.object({ treatments: z.set(z.string()) })
    };
    const onDataChange = vi.fn();
    render(<FormContent instrument={instrument} onDataChange={onDataChange} onSubmit={vi.fn()} />);
    expect(mocks.subscribe).toBeDefined();
    const first = { treatments: new Set(['lubricantes']) };
    const second = { treatments: new Set(['hidratantes']) };
    expect(mocks.subscribe!.selector(first)).not.toBe(mocks.subscribe!.selector(second));
    mocks.subscribe!.onChange(second);
    expect(onDataChange).toHaveBeenLastCalledWith(second);
  });
});
