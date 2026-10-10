import { describe, expect, it } from 'vitest';
import { seoConfig, getMetaDescription } from '#astro-utils/seo-utils';

describe('seo-utils', () => {
  describe('seoConfig', () => {
    it('exports SEO configuration object', () => {
      expect(seoConfig).toBeDefined();
      expect(seoConfig).toHaveProperty('defaultTitle');
      expect(seoConfig).toHaveProperty('defaultDescription');
      expect(seoConfig).toHaveProperty('siteName');
      expect(seoConfig).toHaveProperty('locale');
      expect(seoConfig).toHaveProperty('keywords');
    });

    it('names the site by its title, not its machine identifier', () => {
      expect(seoConfig.siteName).toBe('Test Site');
      expect(seoConfig.siteName).not.toBe(mockEnv.SITE_ID);
    });

    it('has array of keywords', () => {
      expect(Array.isArray(seoConfig.keywords)).toBe(true);
    });
  });

  describe('getMetaDescription', () => {
    it('returns custom description when provided', () => {
      const custom = 'This is a custom description';
      const result = getMetaDescription({ custom });

      expect(result).toBe(custom);
    });

    it('generates description from word and definition', () => {
      const result = getMetaDescription({
        word: 'serendipity',
        definition: 'The faculty of making fortunate discoveries by accident.',
      });

      expect(result).toContain('serendipity');
      expect(result).toContain('The faculty of making fortunate discoveries by accident.');
    });

    it('truncates long definitions to ~150 characters', () => {
      const longDefinition = 'A'.repeat(200);
      const result = getMetaDescription({
        word: 'test',
        definition: longDefinition,
      });

      expect(result.length).toBeLessThan(160);
      expect(result).toContain('...');
    });

    it('returns default description when no options provided', () => {
      const result = getMetaDescription();

      expect(result).toBe(seoConfig.defaultDescription);
    });

    it('returns default description when word without definition', () => {
      const result = getMetaDescription({ word: 'test' });

      expect(result).toBe(seoConfig.defaultDescription);
    });

    it('returns default description when definition without word', () => {
      const result = getMetaDescription({ definition: 'A test definition' });

      expect(result).toBe(seoConfig.defaultDescription);
    });

    it('includes site name in word descriptions', () => {
      const result = getMetaDescription({
        word: 'test',
        definition: 'A test definition',
      });

      expect(result).toContain(seoConfig.siteName);
    });
  });
});
