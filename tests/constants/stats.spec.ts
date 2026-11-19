import { describe, expect, it } from 'vitest';

import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
} from '#constants/stats';

describe('stats-definitions', () => {
  // The slugs are the URL path of each stats page
  it('keeps the slug constants the stats page URLs are built from', () => {
    expect(STATS_SLUGS.ALPHABETICAL_ORDER).toBe('alphabetical-order');
    expect(STATS_SLUGS.DOUBLE_LETTERS).toBe('double-letters');
    expect(STATS_SLUGS.MOST_COMMON_LETTER).toBe('most-common-letter');
    expect(STATS_SLUGS.WORDS_ENDING_LY).toBe('words-ending-ly');
    expect(STATS_SLUGS.ALL_CONSONANTS).toBe('all-consonants');
  });

  it.each([
    ['suffix', Object.values(SUFFIX_DEFINITIONS), 5],
    ['letter pattern', Object.values(LETTER_PATTERN_DEFINITIONS), 3],
    ['consonant and vowel pattern', Object.values(PATTERN_DEFINITIONS), 2],
  ])('describes a %s page by its word count', (_kind, definitions, count) => {
    for (const definition of definitions) {
      expect(definition.category).toBe('stats');
      expect(definition.metaDescription(count)).toContain(`${count} Words`);
    }
  });

  describe('DYNAMIC_STATS_DEFINITIONS', () => {
    it('pageDescription functions work with parameters', () => {
      const mostCommonDef = DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER];
      if (!mostCommonDef || typeof mostCommonDef.pageDescription !== 'function') {
        throw new Error('Most-common-letter page description is not dynamic');
      }
      const result = mostCommonDef.pageDescription('e');
      expect(typeof result).toBe('string');
      expect(result).toContain('e');
    });

    it('metaDescription functions work with parameters', () => {
      const leastCommonDef = DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER];
      if (!leastCommonDef || typeof leastCommonDef.metaDescription !== 'function') {
        throw new Error('Least-common-letter meta description is not dynamic');
      }
      const result = leastCommonDef.metaDescription(5, 'z');
      expect(typeof result).toBe('string');
      expect(result).toContain('5 Words');
      expect(result).toContain('z');
    });
  });
});
