/**
 * Architecture test to keep browser bundles small
 *
 * Bundled <script> blocks in .astro files import a few modules from utils/
 * and src/utils/. Vite ships everything those modules import as values, so a
 * single re-export in one of them (say, of a dictionary helper) pulls the
 * part-of-speech vocabulary into every page's JavaScript while every other
 * gate stays green. The test follows value imports through utils/, types/,
 * constants/ and src/utils/, and each one it meets must be an edge listed
 * below. `import type` and `export type` are erased at build time and always
 * allowed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

// Every value import client scripts reach today, as `module -> specifier`, so
// a new import fails even between modules already listed. This list should
// shrink, not grow: an added edge grows every page's JavaScript, so build and
// compare the shared chunk in dist/_astro/ before adding one.
const CLIENT_VALUE_EDGES = new Set([
  'constants/stats.ts -> #utils/i18n-utils',
  'constants/urls.ts -> #constants/stats',
  'constants/urls.ts -> #utils/text-utils',
  'src/utils/url-utils.ts -> #constants/urls',
  'src/utils/url-utils.ts -> #utils/text-utils',
  'src/utils/url-utils.ts -> #utils/url-utils',
  'src/utils/url-utils.ts -> astro:env/client',
  'utils/i18n-utils.ts -> #locales/en.json',
  'utils/i18n-utils.ts -> #utils/type-guards',
  'utils/text-pattern-utils.ts -> #constants/text-patterns',
  'utils/text-utils.ts -> #utils/text-pattern-utils',
  'utils/url-utils.ts -> #constants/urls',
  'utils/word-validation.ts -> #utils/type-guards',
]);

// is:inline scripts (JSON-LD, analytics) are emitted verbatim, not bundled
const BUNDLED_SCRIPT = /<script(?![^>]*\bis:inline\b)[^>]*>([\s\S]*?)<\/script>/g;
// import/export statements with a module specifier; the clause before
// `from` never contains quotes or semicolons, which keeps a match inside one
// statement
const STATIC_IMPORT = /^\s*(?:import|export)\s+(type\s+)?(?:[^;'"]*?\bfrom\s*)?['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

const valueImports = (source: string): string[] => [
  ...[...source.matchAll(STATIC_IMPORT)]
    .filter(([, typeOnly]) => !typeOnly)
    .flatMap(match => match[2] ? [match[2]] : []),
  ...[...source.matchAll(DYNAMIC_IMPORT)].flatMap(match => match[1] ? [match[1]] : []),
];

// The TypeScript aliases from package.json `imports`; anything else (npm
// packages, astro: modules, JSON) is an edge but is not followed
const ALIAS_DIRS: Record<string, string> = {
  utils: 'utils',
  types: 'types',
  constants: 'constants',
  'astro-utils': 'src/utils',
};

const resolveLocal = (specifier: string): string | null => {
  if (specifier === '#types') {
    return 'types/index.ts';
  }
  const match = /^#(utils|types|constants|astro-utils)\/(.+)$/.exec(specifier);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const directory = ALIAS_DIRS[match[1]];
  return directory ? `${directory}/${match[2]}.ts` : null;
};

const clientEntryModules = (): string[] => {
  const astroFiles = fs.readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.astro'));
  const specifiers = astroFiles.flatMap(file => {
    const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
    return [...content.matchAll(BUNDLED_SCRIPT)].flatMap(match => match[1] ? valueImports(match[1]) : []);
  });
  return [...new Set(specifiers.map(resolveLocal).filter((value): value is string => value !== null))];
};

/**
 * Every value import reachable from the client scripts, as `module -> specifier`.
 */
const clientValueEdges = (): Set<string> => {
  const queue = clientEntryModules();
  const seen = new Set<string>(queue);
  const edges = new Set<string>();

  while (queue.length > 0) {
    const modulePath = queue.shift();
    if (!modulePath) {
      continue;
    }
    const content = fs.readFileSync(path.join(ROOT, modulePath), 'utf-8');

    for (const specifier of valueImports(content)) {
      edges.add(`${modulePath} -> ${specifier}`);
      const resolved = resolveLocal(specifier);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return edges;
};

describe('Architecture: client bundle imports', () => {
  it('finds the modules client scripts import', () => {
    expect(clientEntryModules().length).toBeGreaterThan(0);
  });

  it('client-reachable modules import values only along the listed edges', () => {
    const unlisted = [...clientValueEdges()].filter(edge => !CLIENT_VALUE_EDGES.has(edge));

    expect(unlisted).toEqual([]);
  });

  it('lists no edge the client scripts no longer reach', () => {
    const reached = clientValueEdges();
    const stale = [...CLIENT_VALUE_EDGES].filter(edge => !reached.has(edge));

    expect(stale).toEqual([]);
  });
});
