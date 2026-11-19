import { beforeEach, describe, expect, it } from 'vitest';

import { getUrl, getWordUrl } from '#astro-utils/url-utils';

// WordLink.astro links a word with getWordUrl, and SiteLink adds the base path
// with getUrl: this is the address a visitor lands on.
describe('word links', () => {
  beforeEach(() => {
    mockEnv.BASE_PATH = '/';
  });

  describe('getWordUrl', () => {
    it.each([
      ['serendipity', '/word/serendipity'],
      ['ice cream', '/word/ice-cream'],
      ["don't", '/word/dont'],
      ['', ''],
    ])('names %j as %j, without the base path', (word, route) => {
      mockEnv.BASE_PATH = '/occasional-wotd';

      expect(getWordUrl(word)).toBe(route);
    });
  });

  it.each([
    ['/', 'serendipity', '/word/serendipity/'],
    ['/occasional-wotd', 'serendipity', '/occasional-wotd/word/serendipity/'],
    ['/occasional-wotd', 'ice cream', '/occasional-wotd/word/ice-cream/'],
    ['/occasional-wotd', "don't", '/occasional-wotd/word/dont/'],
  ])('with BASE_PATH %j the link for %j is %j', (basePath, word, href) => {
    mockEnv.BASE_PATH = basePath;

    expect(getUrl(getWordUrl(word))).toBe(href);
  });
});
