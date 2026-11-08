import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';
import { resolveTheme, safeColor, type ThemeSpec } from '../src/theme';

describe('theme resolution', () => {
  it('keeps the built-in string themes', () => {
    const defaults = resolveTheme('default');
    expect(defaults).toMatchObject({ name: 'default', background: '#fbf9f6' });
    expect(resolveTheme('light')).toMatchObject({ name: 'default', background: '#fbf9f6' });
    expect(resolveTheme('dark')).toMatchObject({ name: 'dark', background: '#14191a' });
    expect(resolveTheme('academy').palette[0]).toBe('#4e79a7');
  });

  it('maps ThemeSpec tokens and visual overrides', () => {
    const spec: ThemeSpec = {
      id: 'brand',
      label: 'Brand',
      baseTheme: 'dark',
      tokens: {
        colorBackground: '#010203',
        colorText: '#111111',
        colorTextSecondary: '#222222',
        colorStroke: '#333333',
        category10: ['#aa0000', '#00aa00'],
        colorSurface: '#444444',
        colorTextInverse: '#eeeeee',
        colorDefault: '#123456',
        fontFamily: 'Georgia, serif',
        lineWidth: 3,
      },
      style: { palette: ['#abcdef', '#123123'] },
    };
    expect(resolveTheme(spec)).toMatchObject({
      name: 'dark',
      background: '#010203',
      text: '#111111',
      muted: '#222222',
      grid: '#333333',
      palette: ['#abcdef', '#123123'],
      fontFamily: 'Georgia, serif',
      lineWidth: 3,
    });
  });

  it('rejects unsafe ThemeSpec colors', () => {
    const theme = resolveTheme({
      id: 'unsafe',
      label: 'Unsafe',
      tokens: {
        colorText: 'url(javascript:alert(1))',
        colorBackground: 'expression(alert(1))',
      },
    });
    expect(theme.text).toBe('#1c1916');
    expect(theme.background).toBe('#fbf9f6');
  });

  it('uses the context theme when the source has none', () => {
    const view = buildView(
      `vis column
data
  - category 甲
    value 1
`,
      { theme: { id: 'dark-spec', label: 'Dark spec', baseTheme: 'dark' } },
    );
    expect(view.kind).toBe('vchart');
    expect(view.background).toBe('#14191a');
  });

  it('accepts only color literal syntax', () => {
    expect(safeColor('rgba(1, 2, 3, 0.5)')).toBe('rgba(1, 2, 3, 0.5)');
    expect(safeColor('transparent')).toBe('transparent');
    expect(safeColor('var(--x)')).toBeUndefined();
    expect(safeColor('javascript:alert(1)')).toBeUndefined();
  });
});
