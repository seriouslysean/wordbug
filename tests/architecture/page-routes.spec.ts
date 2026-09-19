import {
  mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  afterAll, beforeAll, describe, expect, it, vi,
} from 'vitest';

// tests/setup.ts swaps the locale for a small fixture that lacks some page
// headings; building the page list reads them all.
vi.unmock('#locales/en.json');

import { getAllWords } from '#tools/utils';
import { getAllPageMetadata } from '#utils/page-metadata-utils';

const PAGES_DIR = 'src/pages';
const PAGE_EXTENSION = '.astro';

const isRest = (name: string): boolean => /^\[\.\.\.[^\]]+\]$/.test(name);
const isParam = (name: string): boolean => /^\[[^\]]+\]$/.test(name) && !isRest(name);

// Whether a URL path's segments resolve to a page under dir, by Astro's
// file-based routing. Only .astro files are pages; the .ts files beside them
// are endpoints (rss.xml.ts). A file or directory whose name starts with `_`
// is not routed. With no segment left, the path is the directory's own: its
// index page. A literal file or directory claims its name at that level, so
// a path that names one must resolve through it: `[year]` would otherwise
// accept any segment, including `part-of-speech`, and only its
// getStaticPaths (which needs the Astro runtime) knows the one it does not
// generate. A parameter (`[year]`) matches one segment; a rest parameter
// (`[...path]`) matches zero or more, as a page that takes all that remain or
// a directory that takes any number before its entries resolve the rest.
const resolvesToPage = (dir: string, segments: string[]): boolean => {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter(entry => !entry.name.startsWith('_'));
  const pages = entries
    .filter(entry => entry.isFile() && entry.name.endsWith(PAGE_EXTENSION))
    .map(entry => entry.name.slice(0, -PAGE_EXTENSION.length));
  const dirs = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  const byRest = (): boolean => pages.some(isRest)
    || dirs.filter(isRest).some(name => Array.from({ length: segments.length + 1 }, (_, taken) => segments.slice(taken))
      .some(remaining => resolvesToPage(join(dir, name), remaining)));

  if (segments.length === 0) {
    return pages.includes('index') || byRest();
  }

  const [segment, ...rest] = segments;
  if (!segment) {
    return pages.includes('index') || byRest();
  }
  if (pages.includes(segment) || dirs.includes(segment)) {
    return (rest.length === 0 && pages.includes(segment))
      || (dirs.includes(segment) && resolvesToPage(join(dir, segment), rest));
  }
  return (rest.length === 0 && pages.some(isParam))
    || dirs.filter(isParam).some(name => resolvesToPage(join(dir, name), rest))
    || byRest();
};

// Whether a URL path resolves to a page in the pages tree at root.
const isRouted = (root: string, urlPath: string): boolean =>
  resolvesToPage(root, urlPath.split('/').filter(Boolean));

// Architecture layer: page metadata drives the social card generator and
// llms.txt, while src/pages decides what the site serves. The social images
// spec compares metadata with the generator, which reads the same metadata,
// so only the route files can say a listed page is real. Runs against the
// demo dataset for the dynamic pages.
describe('Architecture: page routes', () => {
  it('every page with metadata has a route under src/pages', () => {
    const { words } = getAllWords();
    const paths = getAllPageMetadata(words).map(page => page.path);
    const unrouted = paths.filter(path => !isRouted(PAGES_DIR, path));

    expect(words.length).toBeGreaterThan(0);
    expect(unrouted).toEqual([]);
  });
});

// The resolver itself, on a pages tree built for the routing rules src/pages
// does not exercise yet.
describe('route resolution', () => {
  const ctx = { root: '' };
  const TREE = [
    'index.astro',
    'about.astro',
    '_draft.astro',
    '_partials/index.astro',
    '_partials/card.astro',
    'blog/[slug].astro',
    'docs/[...path].astro',
    'files/[...path]/raw.astro',
  ];

  beforeAll(() => {
    ctx.root = mkdtempSync(join(tmpdir(), 'wotd-page-routes-'));
    for (const file of TREE) {
      mkdirSync(dirname(join(ctx.root, file)), { recursive: true });
      writeFileSync(join(ctx.root, file), '');
    }
  });

  afterAll(() => {
    rmSync(ctx.root, { recursive: true, force: true });
  });

  it.each([
    ['/', true, 'the root index page'],
    ['/about', true, 'a literal page'],
    ['/about/extra', false, 'a segment past a literal page'],
    ['/_draft', false, 'an underscore page, which Astro ignores'],
    ['/_partials', false, 'the index of an underscore directory'],
    ['/_partials/card', false, 'a page in an underscore directory'],
    ['/blog/post', true, 'a dynamic parameter'],
    ['/blog', false, 'a directory with no index page'],
    ['/blog/post/extra', false, 'more segments than a parameter matches'],
    ['/docs', true, 'a rest parameter matching no segment'],
    ['/docs/intro', true, 'a rest parameter matching one segment'],
    ['/docs/guide/intro', true, 'a rest parameter matching several segments'],
    ['/files/raw', true, 'a rest directory matching no segment'],
    ['/files/a/b/raw', true, 'a rest directory matching several segments'],
    ['/files/a', false, 'a rest directory without the page inside it'],
  ])('resolves %s to %s: %s', (urlPath, expected) => {
    expect(isRouted(ctx.root, urlPath)).toBe(expected);
  });
});
