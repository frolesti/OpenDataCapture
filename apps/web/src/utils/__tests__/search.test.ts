import { describe, expect, it } from 'vitest';

import { normalizeSearchText } from '../search';

describe('accent-insensitive user search', () => {
  it.each([
    ['Cèlia Torres', 'celia'],
    ['Ángel Ramírez', 'angel ramirez'],
    ['Anna Munyoz', 'ÀNNA'],
    ['Ana Isabel Sánchez Santamaria', 'sanchez'],
    ['Lidón Pla Meseguer', 'lidon'],
    ['Félix Berrocal', 'felix'],
    ['Jose Miguel Artica Garcia', 'García'],
    ['Cèlia Torres', 'Ce\u0300lia'],
    ['Cèlia Torres ctorres celia@example.com', 'CTORRES'],
    ['Cèlia Torres ctorres celia@example.com', 'CELIA@EXAMPLE.COM'],
    ['Cèlia Torres', '  celia  ']
  ])('finds "%s" when searching for "%s"', (name, query) => {
    expect(normalizeSearchText(name).includes(normalizeSearchText(query))).toBe(true);
  });

  it('does not match another name', () => {
    expect(normalizeSearchText('Cèlia Torres').includes(normalizeSearchText('Anna'))).toBe(false);
  });

  it('retains the behavior of an empty search', () => {
    expect(normalizeSearchText('Cèlia Torres').includes(normalizeSearchText(''))).toBe(true);
  });

  it('does not modify the displayed names', () => {
    const user = { firstName: 'Cèlia', lastName: 'Torres' };
    normalizeSearchText(`${user.firstName} ${user.lastName}`);
    expect(user.firstName).toBe('Cèlia');
  });
});
