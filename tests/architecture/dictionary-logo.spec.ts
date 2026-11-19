/**
 * Architecture test for the Merriam-Webster logo.
 *
 * Its brand guidelines say "You are not allowed to edit or modify the
 * Merriam-Webster logo" (https://dictionaryapi.com/info/branding-guidelines).
 * Two things could: a changed file, and a pipeline that re-encodes it. The
 * file is held to the bytes Merriam-Webster serves, and the page that shows
 * it to a plain <img> of the imported file, which Vite emits as it is, where
 * astro:assets' <Image> would resize it and convert it to WebP.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): Buffer => fs.readFileSync(path.join(process.cwd(), file));

// sha256 of https://dictionaryapi.com/images/info/branding-guidelines/MWLogo_LightBG_120x120_2x.png,
// the image the guidelines page offers for light backgrounds, downloaded 12 October 2026
const OFFICIAL_SHA256 = '6ddee7e22cbe0686e9ae6de180eea8342ae89d4f0e923b39d409e6a0c76f49bd';

describe('Architecture: dictionary logo', () => {
  it('ships the Merriam-Webster logo byte for byte as Merriam-Webster supplies it', () => {
    const logo = read('src/assets/merriam-webster-logo.png');

    expect(createHash('sha256').update(logo).digest('hex')).toBe(OFFICIAL_SHA256);
  });

  it('shows it at an approved size without passing it through an image pipeline or a filter', () => {
    const page = read('src/pages/attributions.astro').toString('utf-8');

    const tag = page.match(/<img\b[^>]*\{merriamWebsterLogo\.src\}[^>]*>/)?.[0] ?? '';
    // Attribute order is free; what counts is the size attributes and that nothing restyles the tag
    const attribute = (name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

    expect(tag).not.toBe('');
    // The logo file itself is the image shown, not a variant that only refers to it
    expect(tag).toMatch(/\ssrc=\{merriamWebsterLogo\.src\}/);
    // 50, 100 and 125px are the sizes the guidelines approve, and the logo is square
    expect(['50', '100', '125']).toContain(attribute('width'));
    expect(attribute('height')).toBe(attribute('width'));
    expect(attribute('style')).toBeUndefined();
    expect(page).not.toContain('astro:assets');
    expect(page).not.toMatch(/filter\s*:/);
  });
});
