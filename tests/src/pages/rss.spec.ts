import { describe, expect, it, vi } from 'vitest';
import { GET } from '#pages/rss.xml.ts';

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

describe('RSS feed', () => {
  it('HTML-escapes definition text before the RSS serializer XML-escapes it', async () => {
    const response = await GET();

    await expect(response.text()).resolves.toContain(
      '<description>(adjective) one &amp;lt; two &amp;amp; three</description>',
    );
  });

  it('links the channel to the site home page under BASE_PATH', async () => {
    mockEnv.BASE_PATH = '/vocab';

    const feed = await (await GET()).text();

    expect(feed).toContain('<link>https://test.com/vocab/</link>');
    expect(feed).toContain('<atom:link href="https://test.com/vocab/rss.xml"');
  });
});
