import { describe, expect, it } from 'vitest';

import { resolveHexColor } from '#utils/color-utils';

const FALLBACK = '#9a3412';

describe('resolveHexColor', () => {
  it.each(['#abc', '#abcd', '#9a3412', '#9a341280'])('accepts %s', (color) => {
    expect(resolveHexColor('COLOR_PRIMARY', color, FALLBACK)).toBe(color);
  });

  it('accepts uppercase digits and returns them in lowercase', () => {
    expect(resolveHexColor('COLOR_PRIMARY', '#9A3412', FALLBACK)).toBe('#9a3412');
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['blank', ' \n '],
  ])('falls back to the default when %s', (_, value) => {
    expect(resolveHexColor('COLOR_PRIMARY', value, FALLBACK)).toBe(FALLBACK);
  });

  it('ignores surrounding whitespace', () => {
    expect(resolveHexColor('COLOR_PRIMARY', ' #c2410c\n', FALLBACK)).toBe('#c2410c');
  });

  it.each([
    ['two colors on two lines', '#9a3412\n#ffffff'],
    ['a trailing declaration separator', 'red;'],
    ['a paint server reference', 'url(#other)'],
    ['a named color', 'rebeccapurple'],
    ['a functional color', 'rgb(154, 52, 18)'],
    ['a missing hash', '9a3412'],
    ['a digit count CSS does not allow', '#9a341'],
    ['a non-hex digit', '#9a341g'],
  ])('throws naming the setting for %s', (_, value) => {
    expect(() => resolveHexColor('COLOR_PRIMARY_DARK', value, FALLBACK))
      .toThrow(`COLOR_PRIMARY_DARK must be a hex color such as #9a3412, got ${JSON.stringify(value)}`);
  });
});
