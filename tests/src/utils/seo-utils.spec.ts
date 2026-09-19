import { describe, expect, it, vi } from 'vitest';

vi.mock('#astro-utils/url-utils', () => ({
  getFullUrl: vi.fn((path) => `https://test.com${path}`),
}));

import { seoConfig, getMetaDescription, generateSeoMetadata } from '#astro-utils/seo-utils';

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

  describe('generateSeoMetadata', () => {
    it('generates complete SEO metadata object', () => {
      const metadata = generateSeoMetadata({
        title: 'Test Page',
        description: 'Test description',
        pathname: '/test',
      });

      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('canonical');
      expect(metadata).toHaveProperty('openGraph');
      expect(metadata).toHaveProperty('twitter');
      expect(metadata).toHaveProperty('keywords');
    });

    it('appends site name to title', () => {
      const metadata = generateSeoMetadata({
        title: 'Test Page',
        pathname: '/test',
      });

      expect(metadata.title).toContain('Test Page');
      expect(metadata.title).toContain(seoConfig.siteName);
    });

    it('uses default title when no title provided', () => {
      const metadata = generateSeoMetadata({
        pathname: '/test',
      });

      expect(metadata.title).toBe(seoConfig.defaultTitle);
    });

    it('uses default description when no description provided', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        pathname: '/test',
      });

      expect(metadata.description).toBe(seoConfig.defaultDescription);
    });

    it('generates canonical URL from pathname', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        pathname: '/test-page',
      });

      expect(metadata.canonical).toBe('https://test.com/test-page');
    });

    it('includes OpenGraph metadata', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        description: 'Test desc',
        pathname: '/test',
      });

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph.title).toContain('Test');
      expect(metadata.openGraph.description).toBe('Test desc');
      expect(metadata.openGraph.url).toBe('https://test.com/test');
      expect(metadata.openGraph.siteName).toBe(seoConfig.siteName);
      expect(metadata.openGraph.locale).toBe(seoConfig.locale);
      expect(metadata.openGraph.type).toBe('website');
    });

    it('includes Twitter Card metadata', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        description: 'Test desc',
        pathname: '/test',
      });

      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter.card).toBe('summary_large_image');
      expect(metadata.twitter.title).toContain('Test');
      expect(metadata.twitter.description).toBe('Test desc');
      expect(metadata.twitter.site).toBe(seoConfig.siteName);
    });

    it('combines default and custom keywords', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        pathname: '/test',
        keywords: ['custom1', 'custom2'],
      });

      expect(metadata.keywords).toContain('custom1');
      expect(metadata.keywords).toContain('custom2');
      seoConfig.keywords.forEach(keyword => {
        if (keyword) {
          expect(metadata.keywords).toContain(keyword);
        }
      });
    });

    it('handles empty keywords array', () => {
      const metadata = generateSeoMetadata({
        title: 'Test',
        pathname: '/test',
        keywords: [],
      });

      expect(typeof metadata.keywords).toBe('string');
    });
  });
});
