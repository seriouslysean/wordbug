import { describe, expect, it } from 'vitest';

import { formatPageTitle } from '#utils/page-title-utils';

const word = { word: 'serendipity', date: '20250119', adapter: 'wordnik', data: [] };

describe('formatPageTitle', () => {
  it('uses the stored word date and does not repeat a word page title', () => {
    expect(formatPageTitle('serendipity', word, 'Test Title', 'test-site'))
      .toBe('serendipity, Jan 19, 2025 - Test Title');
  });

  it('keeps a descriptive title for the homepage word', () => {
    expect(formatPageTitle('Word of the Day', word, 'Test Title', 'test-site'))
      .toBe('serendipity, Jan 19, 2025 - Word of the Day | test-site');
  });

  it('returns the site title for an untitled page', () => {
    expect(formatPageTitle(undefined, undefined, 'Test Title', 'test-site')).toBe('Test Title');
  });
});
