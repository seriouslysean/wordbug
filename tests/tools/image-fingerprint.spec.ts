/**
 * The settings fingerprint (the marker's `settings`) covers the renderer as
 * well as the inputs: a sharp or libvips upgrade changes palette-quantized
 * pixels without touching any SVG, PNG option or font, so it has to
 * invalidate the cache on its own. Its probes must also exercise the scaling
 * that fits a long word to the card, which a short word never reaches.
 */

import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';
import { computeSettingsHash, getImageSettings } from '#tools/utils';

const RENDERER = { sharp: '0.35.4', vips: '8.18.6', imagequant: '2.4.1' };

// Estonian collation sorts z between s and t, so it orders zlib before vips
// where English and code-unit order put it last.
const LOCALES = ['et_EE.UTF-8', 'en_US.UTF-8'];
const HASH_UNDER_LOCALE = `
const { computeSettingsHash } = await import('#tools/utils');
console.log(new Intl.Collator().resolvedOptions().locale, computeSettingsHash(${JSON.stringify({ ...RENDERER, zlib: '1.3.1' })}));
`;

describe('computeSettingsHash', () => {
  it('is stable for the same renderer versions', () => {
    expect(computeSettingsHash({ ...RENDERER })).toBe(computeSettingsHash({ ...RENDERER }));
  });

  it('does not depend on the order the renderer reports its versions in', () => {
    const reversed = Object.fromEntries(Object.entries(RENDERER).toReversed());

    expect(computeSettingsHash(reversed)).toBe(computeSettingsHash(RENDERER));
  });

  it.each([
    ['sharp', { ...RENDERER, sharp: '0.34.5' }],
    ['libvips', { ...RENDERER, vips: '8.17.3' }],
    ['a bundled library', { ...RENDERER, imagequant: '2.4.0' }],
  ])('changes when %s changes', (_, versions) => {
    expect(computeSettingsHash(versions)).not.toBe(computeSettingsHash(RENDERER));
  });

  it('does not depend on the system locale', async () => {
    const runs = await Promise.all(LOCALES.map(locale =>
      spawnTool(['--input-type=module', '-e', HASH_UNDER_LOCALE], { env: { LC_ALL: locale } })));
    const [estonian, english] = runs.map(({ stdout }) => stdout.trim().split(' '));
    if (!estonian || !english) {
      throw new Error('Locale hash probe did not return two results');
    }

    // Both collations were in effect, or equal hashes would prove nothing
    expect(estonian[0]).not.toBe(english[0]);
    expect(estonian[1]).toBe(english[1]);
  }, 20000);

  it('probes a word too wide for the card, so the scaling that fits it is fingerprinted', () => {
    const { probes } = getImageSettings(RENDERER);

    expect(probes.some(svg => /fill="url\(#wordGradient\)" transform="scale\(0\.\d+\)"/.test(svg))).toBe(true);
  });

  it('does not depend on the case of a color setting', () => {
    vi.stubEnv('COLOR_PRIMARY', '#9A3412');
    const upper = computeSettingsHash(RENDERER);
    vi.stubEnv('COLOR_PRIMARY', '#9a3412');
    const lower = computeSettingsHash(RENDERER);
    vi.unstubAllEnvs();

    // The same color draws the same pixels, so it must not re-render every card
    expect(upper).toBe(lower);
  });

  it('defaults to the installed renderer', () => {
    expect(computeSettingsHash()).toBe(computeSettingsHash(sharp.versions));
  });
});
