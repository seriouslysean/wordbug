/**
 * How add-word and regenerate-all-words react when the adapter chain is
 * exhausted. A fallback's 404 must not hide a rate limit or a shape error
 * from the primary. Runs the real Wordnik and Wiktionary adapters with fetch
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
const SHAPE = `Wordnik returned an unexpected response shape for "${WORD}"`;

const STATUS_TEXT: Record<number, string> = { 200: 'OK', 404: 'Not Found', 429: 'Too Many Requests' };
const httpResponse = (status: number, body: unknown = []): Response =>
  new Response(JSON.stringify(body), { status, statusText: STATUS_TEXT[status] ?? 'Unknown' });

type AdapterName = 'merriam-webster' | 'wordnik' | 'wiktionary';
type LogLevel = 'error' | 'warn';
const createLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });
const delayMock = vi.fn<(delay?: number) => Promise<void>>();

const ctx = {
  wordsDir: '',
  responses: {
    wordnik: httpResponse(404),
    'merriam-webster': httpResponse(404),
    wiktionary: httpResponse(404),
  } satisfies Record<AdapterName, Response>,
  logger: createLogger(),
  delay: delayMock,
};

const responseFor = (url: string): Response => {
  if (url.startsWith('https://wordnik.test')) {
    return ctx.responses.wordnik;
  }
  return url.startsWith('https://mw.test')
    ? ctx.responses['merriam-webster']
    : ctx.responses.wiktionary;
};

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
  ctx.responses.wordnik = httpResponse(404);
  ctx.responses['merriam-webster'] = httpResponse(404);
  ctx.responses.wiktionary = httpResponse(404);
  ctx.logger = createLogger();
  ctx.delay.mockReset();
  ctx.delay.mockResolvedValue(undefined);

  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async url => responseFor(String(url))));
  vi.stubEnv('DICTIONARY_ADAPTER', 'wordnik');
  vi.stubEnv('DICTIONARY_FALLBACK', 'wiktionary');
  vi.stubEnv('WORDNIK_API_KEY', 'test-key');
  vi.stubEnv('WORDNIK_API_URL', 'https://wordnik.test/v4');
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
    ctx.responses.wordnik = httpResponse(429);

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": wordnik: ${RATE_LIMITED} | wiktionary: ${NOT_FOUND}`,
    });
  });

  it('reports an unexpected shape, not "not found", when only the fallback said not found', async () => {
    ctx.responses.wordnik = httpResponse(200, { message: 'unexpected' });

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": wordnik: ${SHAPE} | wiktionary: ${NOT_FOUND}`,
    });
  });

  it('reports an API change, not "not found", when Merriam-Webster answered with an object', async () => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
    ctx.responses['merriam-webster'] = httpResponse(200, { error: 'moved' });

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": merriam-webster: Merriam-Webster returned an unexpected response shape for "${WORD}" | wiktionary: ${NOT_FOUND}`,
    });
  });

  it('reports an API change, not "not found", when Wiktionary answered with an object', async () => {
    ctx.responses.wiktionary = httpResponse(200, { entries: [] });

    await addWord();

    expect(ctx.logger.error).toHaveBeenCalledExactlyOnceWith('Failed to add word', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": wordnik: ${NOT_FOUND} | wiktionary: Wiktionary returned an unexpected response shape for "${WORD}"`,
    });
  });

  it('reports "not found", as input rather than a fault, when every adapter said not found', async () => {
    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word not found in dictionary', {
      word: WORD,
      errorMessage: `All dictionary adapters failed for "${WORD}": wordnik: ${NOT_FOUND} | wiktionary: ${NOT_FOUND}`,
    });
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  it.each([
    ['suggestions', ['zydeco', 'zyzzyva']],
    ['no entry from the configured dictionary', [{ meta: { id: WORD, src: 'learners' }, shortdef: ['a place'] }]],
  ])('reports "not found" when Merriam-Webster answered with %s and the fallback said not found', async (_, body) => {
    vi.stubEnv('DICTIONARY_ADAPTER', 'merriam-webster');
    vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
    ctx.responses['merriam-webster'] = httpResponse(200, body);

    await addWord();

    expect(ctx.logger.warn).toHaveBeenCalledWith('Word not found in dictionary', expect.objectContaining({ word: WORD }));
    expect(ctx.logger.error).not.toHaveBeenCalled();
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
    [{ word: WORD, meanings: [{ partOfSpeech: 'noun', definitions }] }];
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
      adapter: 'wordnik',
      answer: 'text renamed to definitionText',
      body: [{ partOfSpeech: 'noun', definitionText: 'a place' }],
      reported: unexpectedShape('Wordnik'),
    },
    {
      adapter: 'wordnik',
      answer: 'every text empty',
      body: [{ partOfSpeech: 'noun', text: '' }, { partOfSpeech: 'verb', text: '' }],
      reported: unexpectedShape('Wordnik'),
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
      answer: 'a meaning whose definitions list is empty',
      body: wiktionaryEntry([]),
      reported: notFound,
    },
    {
      adapter: 'wordnik',
      answer: 'an empty definitions list',
      body: [],
      reported: notFound,
    },
  ];

  it.each(cases)('reports $adapter answering with $answer at $reported.level', async ({ adapter, body, reported }) => {
    vi.stubEnv('DICTIONARY_ADAPTER', adapter);
    vi.stubEnv('DICTIONARY_FALLBACK', 'none');
    vi.stubEnv('MERRIAM_WEBSTER_API_KEY', 'test-key');
    vi.stubEnv('MERRIAM_WEBSTER_API_URL', 'https://mw.test/api/v3/references');
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
    ctx.responses.wordnik = httpResponse(429);

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
