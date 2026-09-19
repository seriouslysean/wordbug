/**
 * Holds every registered adapter to the canonical contract. Each adapter has
 * a directory of partner response bodies under fixtures/<adapter name>/.
 * not-found.json, where present, is the partner's answer for a word it does
 * not have; every other .json file is a successful answer, and its adapter
 * must turn it into a response the canonical guard accepts, with at least one
 * definition a page can display: the guard alone accepts a response whose
 * every definition is label-only, which add-word would refuse.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { getAdapterNames } from '#adapters';

vi.mock('#utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');
const NOT_FOUND_FIXTURE = 'not-found.json';

// Credentials and endpoints the adapters require before they will fetch
const ADAPTER_ENV = {
  WORDNIK_API_KEY: 'test-key',
  WORDNIK_API_URL: 'https://api.wordnik.test/v4',
  MERRIAM_WEBSTER_API_KEY: 'test-key',
  MERRIAM_WEBSTER_DICTIONARY: 'collegiate',
};

const fixtureDirectories = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .toSorted();

const successFixtures = (adapterName: string): string[] => {
  const directory = path.join(FIXTURES_DIR, adapterName);
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.json') && file !== NOT_FOUND_FIXTURE)
    .toSorted();
};

describe('adapter contract', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [name, value] of Object.entries(ADAPTER_ENV)) {
      vi.stubEnv(name, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('has a fixture directory for every registered adapter and none for anything else', () => {
    expect(fixtureDirectories).toEqual(getAdapterNames().toSorted());
  });

  describe.each(getAdapterNames())('%s', (adapterName) => {
    it('is registered under its own name', async () => {
      const { getAdapterByName } = await import('#adapters');

      expect(getAdapterByName(adapterName).name).toBe(adapterName);
    });

    it('has at least one successful response fixture', () => {
      expect(successFixtures(adapterName)).not.toEqual([]);
    });

    it.each(successFixtures(adapterName))('turns %s into a canonical, usable response', async (file) => {
      const body = fs.readFileSync(path.join(FIXTURES_DIR, adapterName, file), 'utf-8');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
      const word = path.basename(file, '.json');
      const { getAdapterByName } = await import('#adapters');
      const { isCanonicalResponse } = await import('#utils/adapter-utils');
      const { isValidDictionaryData } = await import('#utils/word-data-utils');

      const response = await getAdapterByName(adapterName).fetchWordData(word);

      expect(isCanonicalResponse(response, word)).toBe(true);
      expect(isValidDictionaryData(response.definitions)).toBe(true);
    });
  });
});
