import { describe, expect, it } from 'vitest';

import {
  DYNAMIC_STATS_DEFINITIONS,
  LETTER_PATTERN_DEFINITIONS,
  PATTERN_DEFINITIONS,
  STATS_SLUGS,
  SUFFIX_DEFINITIONS,
} from '#constants/stats';

describe('stats-definitions', () => {
  describe('STATS_SLUGS', () => {
    it('contains expected slug constants', () => {
      expect(STATS_SLUGS.ALPHABETICAL_ORDER).toBe('alphabetical-order');
      expect(STATS_SLUGS.DOUBLE_LETTERS).toBe('double-letters');
      expect(STATS_SLUGS.MOST_COMMON_LETTER).toBe('most-common-letter');
      expect(STATS_SLUGS.WORDS_ENDING_LY).toBe('words-ending-ly');
      expect(STATS_SLUGS.ALL_CONSONANTS).toBe('all-consonants');
    });

    it('satisfies StatsSlug constraint', () => {
      Object.values(STATS_SLUGS).forEach(slug => {
        expect(typeof slug).toBe('string');
        expect(slug.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SUFFIX_DEFINITIONS', () => {
    it('contains all expected suffix definitions', () => {
      expect(SUFFIX_DEFINITIONS.ed).toBeDefined();
      expect(SUFFIX_DEFINITIONS.ing).toBeDefined();
      expect(SUFFIX_DEFINITIONS.ly).toBeDefined();
      expect(SUFFIX_DEFINITIONS.ness).toBeDefined();
      expect(SUFFIX_DEFINITIONS.ful).toBeDefined();
      expect(SUFFIX_DEFINITIONS.less).toBeDefined();
    });

    it('has correct structure for each suffix definition', () => {
      Object.entries(SUFFIX_DEFINITIONS).forEach(([, definition]) => {
        expect(definition).toHaveProperty('title');
        expect(definition).toHaveProperty('pageDescription');
        expect(definition).toHaveProperty('metaDescription');
        expect(definition).toHaveProperty('category');
        expect(definition.category).toBe('stats');
        expect(typeof definition.metaDescription).toBe('function');
        
        // Test the metaDescription function
        const result = definition.metaDescription(5);
        expect(typeof result).toBe('string');
        expect(result).toContain('5 Words');
      });
    });
  });

  describe('LETTER_PATTERN_DEFINITIONS', () => {
    it('contains expected pattern definitions', () => {
      expect(LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.ALPHABETICAL_ORDER]).toBeDefined();
      expect(LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.DOUBLE_LETTERS]).toBeDefined();
      expect(LETTER_PATTERN_DEFINITIONS[STATS_SLUGS.PALINDROMES]).toBeDefined();
    });

    it('has correct structure for pattern definitions', () => {
      Object.values(LETTER_PATTERN_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('title');
        expect(definition).toHaveProperty('pageDescription');
        expect(definition).toHaveProperty('metaDescription');
        expect(definition).toHaveProperty('category');
        expect(definition.category).toBe('stats');
        expect(typeof definition.metaDescription).toBe('function');
        
        // Test the metaDescription function
        const result = definition.metaDescription(3);
        expect(typeof result).toBe('string');
        expect(result).toContain('3 Words');
      });
    });
  });

  describe('PATTERN_DEFINITIONS', () => {
    it('contains consonant and vowel pattern definitions', () => {
      expect(PATTERN_DEFINITIONS[STATS_SLUGS.ALL_CONSONANTS]).toBeDefined();
      expect(PATTERN_DEFINITIONS[STATS_SLUGS.ALL_VOWELS]).toBeDefined();
    });

    it('has correct structure for pattern definitions', () => {
      Object.values(PATTERN_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('title');
        expect(definition).toHaveProperty('pageDescription');
        expect(definition).toHaveProperty('metaDescription');
        expect(definition).toHaveProperty('category');
        expect(definition.category).toBe('stats');
        expect(typeof definition.metaDescription).toBe('function');
      });
    });
  });

  describe('DYNAMIC_STATS_DEFINITIONS', () => {
    it('contains dynamic stats definitions', () => {
      expect(DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MOST_COMMON_LETTER]).toBeDefined();
      expect(DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.LEAST_COMMON_LETTER]).toBeDefined();
      expect(DYNAMIC_STATS_DEFINITIONS[STATS_SLUGS.MILESTONE_WORDS]).toBeDefined();
    });

    it('has correct structure for dynamic definitions', () => {
      Object.values(DYNAMIC_STATS_DEFINITIONS).forEach(definition => {
        expect(definition).toHaveProperty('title');
        expect(definition).toHaveProperty('pageDescription');
        expect(definition).toHaveProperty('metaDescription');
        expect(definition).toHaveProperty('category');
        expect(definition.category).toBe('stats');
        expect(typeof definition.pageDescription).toBe('function');
        expect(typeof definition.metaDescription).toBe('function');
      });
    });

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
