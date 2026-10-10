import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

vi.doMock('astro:content', () => ({
  defineCollection: <T,>(config: T): T => config,
}));

const contentConfigUrl = pathToFileURL(path.join(process.cwd(), 'src', 'content.config.ts')).href;

describe('word content schema', () => {
  it('rejects blank words and invalid calendar dates', async () => {
    vi.stubGlobal('__WORD_DATA_PATH__', path.join(process.cwd(), 'data', 'demo', 'words'));
    const { collections } = await import(contentConfigUrl);
    const schema = collections.words.schema;
    const entry = {
      word: 'valid',
      date: '20250121',
      adapter: 'wordnik',
      data: [{ text: 'A definition', partOfSpeech: 'noun' }],
    };

    expect(schema.safeParse({ ...entry, word: '   ' }).success).toBe(false);
    expect(schema.safeParse({ ...entry, date: '20250230' }).success).toBe(false);
    expect(schema.safeParse({ ...entry, date: 'Jan 21, 2025' }).success).toBe(false);
    expect(schema.safeParse(entry).success).toBe(true);
  });
});
