import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('language preference', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.doMock('@douglasneuroinformatics/libui/i18n', async () => {
      const original = await vi.importActual<typeof import('@douglasneuroinformatics/libui/i18n')>(
        '@douglasneuroinformatics/libui/i18n'
      );
      const Translator = original.i18n.constructor as new () => typeof original.i18n;
      return { ...original, i18n: new Translator() };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Spanish without a saved preference', async () => {
    const { default: i18n } = await import('../i18n');
    expect(i18n.resolvedLanguage).toBe('fr');
  });

  it('persists Catalan and restores it after reinitialization', async () => {
    const { default: i18n } = await import('../i18n');
    i18n.changeLanguage('en');
    expect(localStorage.getItem('odc-language')).toBe('en');
    vi.resetModules();
    vi.doMock('@douglasneuroinformatics/libui/i18n', async () => {
      const original = await vi.importActual<typeof import('@douglasneuroinformatics/libui/i18n')>(
        '@douglasneuroinformatics/libui/i18n'
      );
      const Translator = original.i18n.constructor as new () => typeof original.i18n;
      return { ...original, i18n: new Translator() };
    });
    const { default: reloaded } = await import('../i18n');
    expect(reloaded.resolvedLanguage).toBe('en');
  });

  it('persists switching back to Spanish', async () => {
    localStorage.setItem('odc-language', 'en');
    const { default: i18n } = await import('../i18n');
    i18n.changeLanguage('fr');
    expect(localStorage.getItem('odc-language')).toBe('fr');
    vi.resetModules();
    vi.doMock('@douglasneuroinformatics/libui/i18n', async () => {
      const original = await vi.importActual<typeof import('@douglasneuroinformatics/libui/i18n')>(
        '@douglasneuroinformatics/libui/i18n'
      );
      const Translator = original.i18n.constructor as new () => typeof original.i18n;
      return { ...original, i18n: new Translator() };
    });
    const { default: reloaded } = await import('../i18n');
    expect(reloaded.resolvedLanguage).toBe('fr');
  });

  it('ignores unsupported stored languages', async () => {
    localStorage.setItem('odc-language', 'invalid');
    const { default: i18n } = await import('../i18n');
    expect(i18n.resolvedLanguage).toBe('fr');
  });

  it('allows changing language when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const { default: i18n } = await import('../i18n');
    expect(() => i18n.changeLanguage('en')).not.toThrow();
    expect(i18n.resolvedLanguage).toBe('en');
  });
});
