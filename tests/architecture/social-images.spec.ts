import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// tests/setup.ts swaps the locale for a small fixture. The page list needs
// every real heading, as the generator sees it.
vi.unmock('#locales/en.json');

import { getSocialImageUrl } from '#astro-utils/image-utils';
import { getAllWords } from '#tools/utils';
import { getImagesDir, SOCIAL_DIR } from '#utils/image-path-utils';
import { getAllPageMetadata } from '#utils/page-metadata-utils';
import type { WordData } from '#types';

// vitest.config.ts points the CLI side at the demo dataset; the site side
// reads the same value through the mocked astro:env schema below.
const SOURCE_DIR = process.env.SOURCE_DIR ?? '';
const SITE_URL = 'https://test.com';

const trackedCards = (): string[] =>
  execFileSync('git', ['ls-files', '-z', '--', `public/${getImagesDir(SOURCE_DIR)}/${SOCIAL_DIR}`], { encoding: 'utf-8' })
    .split('\0')
    .filter(file => file.endsWith('.png'));

// The file a URL names once a static host has decoded it.
const toTrackedFile = (url: string): string => `public${decodeURI(url.slice(SITE_URL.length))}`;

// Architecture layer: this is a contract between two subsystems, not the
// logic of either. The generator commits cards under public/ and the site
// links to them; the unit specs prove each side follows the naming rules,
// and only the real dataset against the real tracked files proves the two
// still meet. It needs no browser and no build, so it is not an E2E check.
describe('Architecture: social images', () => {
  const ctx: { words: WordData[]; unreadable: string[]; urls: string[] } = {
    words: [],
    unreadable: [],
    urls: [],
  };

  beforeEach(() => {
    mockEnv.SOURCE_DIR = SOURCE_DIR;
    ({ words: ctx.words, failures: ctx.unreadable } = getAllWords());
    ctx.urls = [
      ...ctx.words.map(wordData => getSocialImageUrl({ pathname: `/word/${wordData.word}`, wordData })),
      ...getAllPageMetadata(ctx.words).map(page => getSocialImageUrl({ pathname: page.path })),
    ];
  });

  afterEach(() => {
    mockEnv.SOURCE_DIR = '';
  });

  it('runs against the demo dataset', () => {
    expect(SOURCE_DIR).toBe('demo');
    expect(ctx.words.length).toBeGreaterThan(0);
    expect(ctx.unreadable).toEqual([]);
  });

  it('every social image URL the site emits names a tracked card', () => {
    const tracked = new Set(trackedCards());
    const missing = ctx.urls.filter(url => !tracked.has(toTrackedFile(url)));

    expect(missing).toEqual([]);
  });

  it('every tracked card is linked from a word or a page', () => {
    const linked = new Set(ctx.urls.map(toTrackedFile));
    const orphans = trackedCards().filter(file => !linked.has(file));

    expect(orphans).toEqual([]);
  });
});
