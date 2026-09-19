/**
 * Social card glyphs must be upright. Real glyphs go through the real SVG
 * template and sharp, rasterized to raw pixels in memory; the assertions are on
 * orientation (where a letter's horizontal bar sits), never on bytes, so font,
 * color and encoder changes do not disturb them. Nothing is written to disk.
 */

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSvg } from '#tools/utils';

// The background is white and the darkest gradient stop is far below this, so
// the threshold separates glyph ink from background and anti-aliased fringe.
const INK_LUMINANCE_MAX = 160;

/**
 * Ink pixels per row inside the ink bounding box, top row first.
 */
const inkRows = async (svg: string): Promise<number[]> => {
  const { data, info } = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rowBytes = info.width * info.channels;
  const rows = Array.from({ length: info.height }, (_, y) =>
    [...data.subarray(y * rowBytes, (y + 1) * rowBytes)]
      .filter((value, index) => index % info.channels === 0 && value < INK_LUMINANCE_MAX).length);
  return rows.slice(rows.findIndex(count => count > 0), rows.findLastIndex(count => count > 0) + 1);
};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

/**
 * Ink mass in the top and bottom thirds of the glyph's ink bounding box.
 */
const inkThirds = async (text: string): Promise<{ height: number; top: number; bottom: number }> => {
  const rows = await inkRows(createSvg(text));
  const third = Math.floor(rows.length / 3);
  return { height: rows.length, top: sum(rows.slice(0, third)), bottom: sum(rows.slice(-third)) };
};

describe('social card glyph orientation', () => {
  beforeEach(() => {
    // An empty title and no date leave the main word as the only ink.
    vi.stubEnv('SITE_TITLE', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('draws the bar of "L" at the bottom', async () => {
    const { height, top, bottom } = await inkThirds('L');
    expect(height).toBeGreaterThan(50);
    expect(bottom).toBeGreaterThan(top * 1.5);
  });

  it('draws the bar of "T" at the top', async () => {
    const { height, top, bottom } = await inkThirds('T');
    expect(height).toBeGreaterThan(50);
    expect(top).toBeGreaterThan(bottom * 1.5);
  });
});
