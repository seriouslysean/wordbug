/**
 * Architecture test for the adapter names Add Word accepts.
 *
 * The reusable Site Add Word workflow, which this repository's Add Word and
 * every site's Add Word call, validates DICTIONARY_ADAPTER and DICTIONARY_FALLBACK
 * against its own list before calling the tool, so a missing API key fails
 * with a clear message instead of a silent fallback. That list is a copy of
 * the adapter registry: an adapter added to the registry but not to the
 * workflow would be refused in CI while working locally.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf-8');

const captures = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].flatMap(match => match[1] === undefined ? [] : [match[1]]);

describe('Architecture: adapter names', () => {
  const workflow = read('.github/workflows/site-add-word.yml');
  const registry = read('adapters/index.ts');

  const registered = captures(registry, /^\s+'([a-z-]+)': \w+Adapter,$/gm).toSorted();
  const listedMatch = workflow.match(/VALID="([^"]+)"/);
  const listed = (listedMatch?.[1] ?? '').split(', ').toSorted();
  const handled = captures(workflow, /^\s+([a-z-]+)\) /gm).toSorted();

  it('reads the registry', () => {
    expect(registered.length).toBeGreaterThan(0);
  });

  it('lists exactly the registered adapters in the Add Word key check', () => {
    expect(listed).toEqual(registered);
  });

  it('handles every registered adapter in the key check', () => {
    expect(handled).toEqual(registered);
  });
});
