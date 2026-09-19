/**
 * Settings reach the card renderer from repository variables, which can carry
 * line breaks. Text is drawn on one line, so a break must not become a
 * missing-glyph box; a color is pasted into the SVG, so a malformed one must
 * stop the run instead of rendering a black gradient stop.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { spawnTool } from '#tests/helpers/spawn.ts';
import { createSvg } from '#tools/utils';

const ctx = { outputDir: '' };

describe('createSvg text', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('draws a multi-line site title on one line', () => {
    vi.stubEnv('SITE_TITLE', 'Line one Line two');
    const expected = createSvg('word');

    vi.stubEnv('SITE_TITLE', '\n Line one\r\n\tLine two  ');
    expect(createSvg('word')).toBe(expected);
  });

  it('draws multi-line card text on one line', () => {
    vi.stubEnv('SITE_TITLE', 'Title');

    expect(createSvg(' ice\n\ncream ', '20240101')).toBe(createSvg('ice cream', '20240101'));
  });
});

describe('generate-images color settings', () => {
  beforeEach(() => {
    ctx.outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-image-settings-'));
  });

  afterEach(() => {
    fs.rmSync(ctx.outputDir, { recursive: true, force: true });
  });

  it('exits non-zero naming a malformed color before rendering any card', async () => {
    const { code, stdout, stderr } = await spawnTool(
      ['tools/generate-images.ts', '--page', '/stats'],
      { env: { SOURCE_DIR: 'demo', IMAGES_OUTPUT_DIR: ctx.outputDir, COLOR_PRIMARY: '#9a3412\n#ffffff' }, timeout: 60000 },
    );

    expect(code).toBe(1);
    expect(`${stdout}${stderr}`).toContain('COLOR_PRIMARY');
    expect(fs.readdirSync(ctx.outputDir, { recursive: true })).toEqual([]);
  }, 60000);
});
