/**
 * How add-word and regenerate-all-words react when the adapter chain is
 * exhausted. A fallback's 404 must not hide a rate limit or a shape error
 * from the primary. Runs the real Merriam-Webster and Wiktionary adapters with fetch
 * stubbed per host, writes through a mocked #config/paths, and replaces the
 * backoff delay so retries do not wait.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const WORD = 'zzyzx';
const NOT_FOUND = `Word "${WORD}" not found in dictionary. Please check the spelling.`;
const RATE_LIMITED = 'Rate limit exceeded. Please try again later.';
const SHAPE = `Merriam-Webster returned an unexpected response shape for "${WORD}"`;

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 404: 'Not Found', 429: 'Too Many Requests' };
const httpResponse = (status: number, body: unknown = []): Response =>
  new Response(JSON.stringify(body), { status, statusText: STATUS_TEXT[status] ?? 'Unknown' });

type AdapterName = 'merriam-webster' | 'wiktionary';
type LogLevel = 'error' | 'warn';
const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });
const delayMock = vi.fn<(delay?: number) => Promise<void>>();

const ctx = {
  wordsDir: '',
  responses: {
    'merriam-webster': httpResponse(404),
    wiktionary: httpResponse(404),
  } satisfies Record<AdapterName, Response>,
  logger: createLogger(),
  delay: delayMock,
};

const responseFor = (url: string): Response => (url.startsWith('https://mw.test')
  ? ctx.responses['merriam-webster']
  : ctx.responses.wiktionary);

const addWord = async () => {
  const tool = await import('#tools/add-word');
  await tool.addWord(WORD);
};

const regenerateWordFile = async (word = WORD) => {
  const tool = await import('#tools/regenerate-all-words');
  return tool.regenerateWordFile(word, '20240101', path.join(ctx.wordsDir, '2024', '20240101.json'));
};

beforeEach(() => {
  ctx.wordsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-adapter-failures-'));
  ctx.responses['merriam-webster'] = httpResponse(404);
  ctx.responses.wiktionary = httpResponse(404);
  ctx.logger = createLogger();
  ctx.delay.mockReset();
  ctx.delay.mockResolvedValue(undefined);

  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async url => responseFor(String(url))));
  vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
  vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');
  vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
  vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
  vi.doMock('#config/paths', () => ({
    paths: { words: ctx.wordsDir, images: ctx.wordsDir, fonts: ctx.wordsDir, pages: ctx.wordsDir },
  }));
  vi.doMock('#utils/logger', async (importOriginal) => ({
    ...await importOriginal(),
    logger: ctx.logger,
    exit: vi.fn(),
  }));
  vi.doMock('node:timers/promises', () => ({ setTimeout: ctx.delay }));
});

afterEach(() => {
  vi.doUnmock('#config/paths');
  vi.doUnmock('#utils/logger');
  vi.doUnmock('node:timers/promises');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  fs.rmSync(ctx.wordsDir, { recursive: true, force: true });
});

describe('add-word failure reporting', () => {
  it('reports a rate limit, not "not found", when only the fallback said not found', async () => {
    ctx.responses['merriam-webster'] = httpResponse(429);

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": merriam-webster: ${RATE_LIMITED} | wiktionary: ${NOT_FOUND}`,
    });
  });

  it('reports an API change, not "not found", when Merriam-Webster answered with an object', async () => {
    ctx.responses['merriam-webster'] = httpResponse(200, { error: 'moved' });

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": merriam-webster: ${SHAPE} | wiktionary: ${NOT_FOUND}`,
    });
  });

  it('reports an API change, not "not found", when Wiktionary answered with a list', async () => {
    ctx.responses.wiktionary = httpResponse(200, [{ word: WORD, meanings: [] }]);

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": merriam-webster: ${NOT_FOUND} | wiktionary: Wiktionary returned an unexpected response shape for "${WORD}"`,
    });
  });

  it('reports "not found", as input rather than a fault, when every adapter said not found', async () => {
    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word not found in dictionary', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": merriam-webster: ${NOT_FOUND} | wiktionary: ${NOT_FOUND}`,
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  it.each([
    ['suggestions', ['zydeco', 'zyzzyva']],
    ['no entry from the configured dictionary', [{ meta: { id: WORD, src: 'learners' }, shortdef: ['a place'] }]],
  ])('reports "not found" when Merriam-Webster answered with %s and the fallback said not found', async (_, body) => {
    ctx.responses['merriam-webster'] = httpResponse(200, body);

    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word not found in dictionary', expect.objectContaining({ word: WORD }));
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  // "etc." is a phrase and "pre-" a prefix at Wiktionary: it has the word and
  // answered well, so nothing is at fault
  it('reports a word the dictionary has only as a phrase as input, not a fault', async () => {
    ctx.responses.wiktionary = httpResponse(200, {
      en: [{ partOfSpeech: 'Phrase', language: 'English', definitions: [{ definition: 'And so on.' }] }],
    });

    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word has no definition the site can display', {
      word: WORD,
      errorMessage: expect.stringContaining(`wiktionary: wiktionary has "${WORD}" only as: Phrase.`),
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  it('still reports a fault when the other dictionary failed for a reason of its own', async () => {
    ctx.responses['merriam-webster'] = httpResponse(429);
    ctx.responses.wiktionary = httpResponse(200, {
      en: [{ partOfSpeech: 'Prefix', language: 'English', definitions: [{ definition: 'Before.' }] }],
    });

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', expect.objectContaining({ word: WORD }));
  });

  it('keeps the single-adapter message unchanged when no fallback is configured', async () => {
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');

    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word not found in dictionary', {
      word: WORD,
      errorMessage: NOT_FOUND,
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });
});

// Only a dictionary that lists no definition at all does not have the word.
// One whose field holding the definitions is renamed, or whose every
// definition is blank, has changed its API: a fault, reported at error.
describe('add-word when a dictionary answers with no definition to keep', () => {
  interface FailureCase {
    adapter: AdapterName;
    answer: string;
    body: unknown;
    reported: { level: LogLevel; message: string; errorMessage: string };
  }

  const MW_ENTRY = { meta: { id: WORD, src: 'collegiate' }, fl: 'noun' };
  const wiktionaryEntry = (definitions: unknown[]) =>
    ({ en: [{ partOfSpeech: 'Noun', language: 'English', definitions }] });
  const unexpectedShape = (source: string): FailureCase['reported'] => ({
    level: 'error',
    message: 'Failed to add word',
    errorMessage: `${source} returned an unexpected response shape for "${WORD}"`,
  });
  const notFound: FailureCase['reported'] = {
    level: 'warn',
    message: 'Word not found in dictionary',
    errorMessage: NOT_FOUND,
  };

  const cases: FailureCase[] = [
    {
      adapter: 'merriam-webster',
      answer: 'shortdef renamed to shortdefs',
      body: [{ ...MW_ENTRY, shortdefs: ['a place'] }],
      reported: unexpectedShape('Merriam-Webster'),
    },
    {
      adapter: 'merriam-webster',
      answer: 'every shortdef blank',
      body: [{ ...MW_ENTRY, shortdef: ['', ' '] }],
      reported: unexpectedShape('Merriam-Webster'),
    },
    {
      adapter: 'wiktionary',
      answer: 'definition renamed to text',
      body: wiktionaryEntry([{ text: 'a place' }]),
      reported: unexpectedShape('Wiktionary'),
    },
    {
      adapter: 'wiktionary',
      answer: 'every definition empty',
      body: wiktionaryEntry([{ definition: '' }, { definition: '' }]),
      reported: unexpectedShape('Wiktionary'),
    },
    {
      adapter: 'merriam-webster',
      answer: 'an entry that is only a cross-reference, its shortdef empty',
      body: [{ ...MW_ENTRY, cxs: [{ cxl: 'past tense of', cxtis: [{ cxt: 'run' }] }], shortdef: [] }],
      reported: notFound,
    },
    {
      adapter: 'wiktionary',
      answer: 'a usage whose definitions list is empty',
      body: wiktionaryEntry([]),
      reported: notFound,
    },
    {
      adapter: 'wiktionary',
      answer: 'entries in other languages only',
      body: { fr: [{ partOfSpeech: 'Noun', language: 'French', definitions: [{ definition: 'un lieu' }] }] },
      reported: notFound,
    },
  ];

  it.each(cases)('reports $adapter answering with $answer at $reported.level', async ({ adapter, body, reported }) => {
    vi.stubEnv('DICTIONARY_ADAPTER', adapter);
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');
    ctx.responses[adapter] = httpResponse(200, body);

    await addWord();

    expect(ctx.logger[reported.level]).toHaveBeenCalledExactlyOnceWith(reported.message, {
      word: WORD,
      errorMessage: reported.errorMessage,
    });
    expect(ctx.logger[reported.level === 'error' ? 'warn' : 'error']).not.toHaveBeenCalled();
  });
});

describe('regenerate-all-words rate-limit backoff', () => {
  it('backs off when the primary was rate limited and the fallback said not found', async () => {
    ctx.responses['merriam-webster'] = httpResponse(429);

    const success = await regenerateWordFile();

    expect(success).toBe(false);
    expect(ctx.delay.mock.calls).toEqual([[30000], [60000], [120000]]);
  });

  it('does not back off when every adapter said not found', async () => {
    const success = await regenerateWordFile();

    expect(success).toBe(false);
    expect(ctx.delay).not.toHaveBeenCalled();
  });

  it('does not mistake a word containing "429" for a rate limit', async () => {
    const success = await regenerateWordFile('zz429');

    expect(success).toBe(false);
    expect(ctx.delay).not.toHaveBeenCalled();
  });
});

// The scan once dated an entry by its file name, so words/alpha.json reached
// here with the date "alpha" and was overwritten with it.
describe('regenerate-all-words and a record it could not build validly', () => {
  const STORED = { word: 'alpha', date: '20240101', adapter: 'merriam-webster', data: [{ text: 'a letter', partOfSpeech: 'noun' }] };
  const regenerate = async (date: string) => {
    const filePath = path.join(ctx.wordsDir, 'alpha.json');
    fs.writeFileSync(filePath, JSON.stringify(STORED));
    ctx.responses['merriam-webster'] = httpResponse(200, [{ meta: { id: 'alpha', src: 'collegiate' }, fl: 'noun', shortdef: ['the first letter'] }]);
    const tool = await import('#tools/regenerate-all-words');
    const success = await tool.regenerateWordFile('alpha', date, filePath);
    return { success, stored: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
  };

  it('refuses to write a date that is no calendar day, and leaves the file as it was', async () => {
    const { success, stored } = await regenerate('alpha');

    expect(success).toBe(false);
    expect(stored).toEqual(STORED);
    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to regenerate word file', expect.objectContaining({
      word: 'alpha',
      date: 'alpha',
      error: expect.stringContaining('date must be YYYYMMDD, not alpha'),
    }));
  });

  it('writes the record when it is valid', async () => {
    const { success, stored } = await regenerate('20240101');

    expect(success).toBe(true);
    expect(stored).toMatchObject({ word: 'alpha', date: '20240101', data: [{ text: 'the first letter', partOfSpeech: 'noun' }] });
  });
});
