import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HospitalSelect } from '../HospitalSelect';

vi.mock('@douglasneuroinformatics/libui/hooks', () => ({
  useTranslation: () => ({ t: (value: { en: string }) => value.en })
}));
afterEach(cleanup);

describe('HospitalSelect', () => {
  it('disables the selector until hospitals are available', () => {
    render(<HospitalSelect options={[]} value="" onValueChange={vi.fn()} />);
    expect(screen.getByRole('combobox').hasAttribute('disabled')).toBe(true);
  });

  it('shows a readable label for a structured hospital value', () => {
    render(
      <HospitalSelect
        options={['CAP Sant Martí|||Barcelona|||Barcelona|||Espanya']}
        value="CAP Sant Martí|||Barcelona|||Barcelona|||Espanya"
        onValueChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox').textContent).toContain('CAP Sant Martí, Barcelona (Barcelona)');
  });

  it('supports keyboard selection from a long hospital list', async () => {
    const options = Array.from({ length: 60 }, (_, index) => `Hospital ${index + 1}`);
    function Field() {
      const [value, setValue] = useState(options[0]!);
      return <HospitalSelect options={options} value={value} onValueChange={setValue} />;
    }
    render(<Field />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    const list = await screen.findByRole('listbox');
    expect(screen.getAllByRole('option')).toHaveLength(60);
    fireEvent.keyDown(list, { key: 'End' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Hospital 60' }), { key: 'Enter' });
    expect(screen.getByRole('combobox').textContent).toContain('Hospital 60');
  });
});
