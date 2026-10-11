/**
 * Architecture test for what the URL helpers are given.
 *
 * getUrl() and getFullUrl() take a route and always add BASE_PATH. A served
 * pathname already carries the base, so passing Astro.url.pathname straight in
 * doubles it. At the root base path the two are the same string, which is
 * where the E2E suite runs, so it would not notice:
 * the canonical link was built this way until 3.28.0.
 *
 * This catches direct calls and SiteLink props. A pathname stored in a variable first is
 * not seen.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.join(process.cwd(), 'src');
const SERVED_PATHNAME_AS_ROUTE = /(?:\bget(?:Full)?Url\(|<SiteLink\b[^>]*\bhref=\{)\s*\(?\s*Astro\.url\??\.pathname\b/;

const sourceFiles = fs
  .readdirSync(SRC, { recursive: true, encoding: 'utf-8' })
  .filter(file => file.endsWith('.astro') || file.endsWith('.ts'));

describe('URL helpers', () => {
  it.each([
    'getUrl(Astro.url.pathname)',
    'getFullUrl( Astro.url?.pathname)',
    'getUrl((Astro.url.pathname))',
    '<SiteLink href={Astro.url.pathname}>',
    '<SiteLink class="link" href={(Astro.url?.pathname)}>',
  ])('detects a served pathname passed as a route: %s', (source) => {
    expect(SERVED_PATHNAME_AS_ROUTE.test(source)).toBe(true);
  });

  it.each([
    'getUrl(stripBasePath(Astro.url.pathname))',
    'getFullUrl(getPathname(Astro.url.pathname))',
    '<SiteLink href={stripBasePath(Astro.url.pathname)}>',
  ])('allows a pathname converted to a route: %s', (source) => {
    expect(SERVED_PATHNAME_AS_ROUTE.test(source)).toBe(false);
  });

  it('finds the source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it('never receive Astro.url.pathname without stripBasePath()', () => {
    const offenders = sourceFiles.filter(file =>
      SERVED_PATHNAME_AS_ROUTE.test(fs.readFileSync(path.join(SRC, file), 'utf-8')));

    expect(offenders).toEqual([]);
  });
});
