import { describe, expect, it, vi } from 'vitest';

const ctx = vi.hoisted(() => ({
  words: [{
    id: '2025/20250121',
    data: {
      word: 'occasional',
      date: '20250121',
      adapter: 'wordnik',
      data: [{
        text: 'one < two & three',
        partOfSpeech: 'adjective',
        sourceDictionary: 'wordnik',
      }],
    },
  }],
}));

vi.mock('astro:content', () => ({
  getCollection: vi.fn(() => Promise.resolve(ctx.words)),
}));

import { GET } from '#pages/rss.xml.ts';

describe('RSS feed', () => {
  it('HTML-escapes definition text before the RSS serializer XML-escapes it', async () => {
    const response = await GET({ site: new URL('https://example.com') });

    await expect(response.text()).resolves.toContain(
      '<description>(adjective) one &amp;lt; two &amp;amp; three</description>',
    );
  });
});
