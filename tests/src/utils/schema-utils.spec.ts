import { describe, expect, it, vi } from 'vitest';

vi.mock('#astro-utils/seo-utils', () => ({
  seoConfig: {
    siteName: 'Test Site',
    defaultDescription: 'Test description',
    author: 'Test Author',
    locale: 'en-US',
  },
}));

vi.mock('#astro-utils/url-utils', () => ({
  getFullUrl: vi.fn((path) => `https://test.com${path}`),
}));

import {
  STRUCTURED_DATA_TYPE,
  getWebsiteSchemaData,
  getWordSchemaData,
  getCollectionSchemaData,
  getBreadcrumbSchema,
} from '#astro-utils/schema-utils';

describe('schema-utils', () => {
  describe('STRUCTURED_DATA_TYPE', () => {
    it('exports schema type constants', () => {
      expect(STRUCTURED_DATA_TYPE.WORD_SINGLE).toBe('WORD_SINGLE');
      expect(STRUCTURED_DATA_TYPE.WORD_LIST).toBe('WORD_LIST');
    });
  });

  describe('getWebsiteSchemaData', () => {
    it('returns WebSite schema with required fields', () => {
      const schema = getWebsiteSchemaData();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Test Site');
      expect(schema.description).toBe('Test description');
      expect(schema.url).toBe('https://test.com/');
    });

    it('includes author information', () => {
      const schema = getWebsiteSchemaData();

      expect(schema.author).toBeDefined();
      if (!schema.author) {
        throw new Error('Website schema has no author');
      }
      expect(schema.author['@type']).toBe('Person');
      expect(schema.author.name).toBe('Test Author');
    });

    it('includes educational audience', () => {
      const schema = getWebsiteSchemaData();

      expect(schema.audience).toBeDefined();
      if (!schema.audience) {
        throw new Error('Website schema has no audience');
      }
      expect(schema.audience['@type']).toBe('EducationalAudience');
      expect(schema.audience.educationalRole).toBe('student');
    });

    it('includes inLanguage from configured locale', () => {
      expect(getWebsiteSchemaData().inLanguage).toBe('en-US');
    });
  });

  describe('getWordSchemaData', () => {
    it('returns DefinedTerm schema for valid word data', () => {
      const wordData = {
        word: 'serendipity',
        definition: 'The faculty of making fortunate discoveries by accident.',
        date: '20240115',
      };

      const schema = getWordSchemaData(wordData);

      expect(schema).not.toBeNull();
      if (!schema) {
        throw new Error('Valid word data produced no schema');
      }
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('DefinedTerm');
      expect(schema.name).toBe('serendipity');
      expect(schema.description).toBe('The faculty of making fortunate discoveries by accident.');
    });

    it('includes term set information', () => {
      const wordData = {
        word: 'test',
        date: '20240115',
        definition: 'A test definition',
      };

      const schema = getWordSchemaData(wordData);

      if (!schema) {
        throw new Error('Valid word data produced no schema');
      }
      expect(schema.inDefinedTermSet).toBeDefined();
      expect(schema.inDefinedTermSet['@type']).toBe('DefinedTermSet');
      expect(schema.inDefinedTermSet.name).toBe('Test Site');
    });

    it('uses fallback description when definition not provided', () => {
      const wordData = {
        word: 'test',
        date: '20240115',
      };

      const schema = getWordSchemaData(wordData);

      if (!schema) {
        throw new Error('Valid word data produced no schema');
      }
      expect(schema.description).toBe('Definition of test');
    });

    it('includes source URL when provided in meta', () => {
      const wordData = {
        word: 'test',
        date: '20240115',
        definition: 'Test definition',
        meta: {
          sourceUrl: 'https://example.com/word/test',
        },
      };

      const schema = getWordSchemaData(wordData);

      if (!schema) {
        throw new Error('Valid word data produced no schema');
      }
      expect(schema.url).toBe('https://example.com/word/test');
    });

    it('returns null for invalid word data', () => {
      // @ts-expect-error Deliberately verifies the runtime guard against null input.
      expect(getWordSchemaData(null)).toBeNull();
      // @ts-expect-error Deliberately verifies the runtime guard against a missing word.
      expect(getWordSchemaData({})).toBeNull();
      // @ts-expect-error Deliberately verifies the runtime guard against a missing word.
      expect(getWordSchemaData({ definition: 'No word' })).toBeNull();
    });

    it('includes inLanguage from configured locale', () => {
      const schema = getWordSchemaData({ word: 'test', date: '20240115', definition: 'a test' });
      if (!schema) {
        throw new Error('Valid word data produced no schema');
      }
      expect(schema.inLanguage).toBe('en-US');
    });
  });

  describe('getCollectionSchemaData', () => {
    it('returns CollectionPage schema', () => {
      const schema = getCollectionSchemaData('Test Collection', 'Collection description', 10);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('CollectionPage');
      expect(schema.name).toBe('Test Collection');
      expect(schema.description).toBe('Collection description');
    });

    it('includes ItemList with count', () => {
      const schema = getCollectionSchemaData('Test', 'Description', 42);

      expect(schema.mainEntity).toBeDefined();
      expect(schema.mainEntity['@type']).toBe('ItemList');
      expect(schema.mainEntity.numberOfItems).toBe(42);
    });

    it('includes educational audience', () => {
      const schema = getCollectionSchemaData('Test', 'Description', 10);

      expect(schema.audience).toBeDefined();
      if (!schema.audience) {
        throw new Error('Collection schema has no audience');
      }
      expect(schema.audience['@type']).toBe('EducationalAudience');
      expect(schema.audience.educationalRole).toBe('student');
    });

    it('handles zero items', () => {
      const schema = getCollectionSchemaData('Empty Collection', 'No items', 0);

      expect(schema.mainEntity.numberOfItems).toBe(0);
    });

    it('includes inLanguage from configured locale', () => {
      expect(getCollectionSchemaData('X', 'Y', 1).inLanguage).toBe('en-US');
    });
  });

  describe('getBreadcrumbSchema', () => {
    it('returns BreadcrumbList schema for valid breadcrumbs', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Words', href: '/words' },
        { label: 'Test Word', href: '/word/test' },
      ];

      const schema = getBreadcrumbSchema(breadcrumbs);

      if (!schema) {
        throw new Error('Valid breadcrumbs produced no schema');
      }
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
    });

    it('creates properly structured breadcrumb items', () => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Words', href: '/words' },
      ];

      const schema = getBreadcrumbSchema(breadcrumbs);

      if (!schema) {
        throw new Error('Valid breadcrumbs produced no schema');
      }
      expect(schema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://test.com/',
      });

      expect(schema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Words',
        item: 'https://test.com/words',
      });
    });

    it('returns null for empty breadcrumbs array', () => {
      expect(getBreadcrumbSchema([])).toBeNull();
    });

    it('returns null for null breadcrumbs', () => {
      // @ts-expect-error Deliberately verifies the runtime guard against null input.
      expect(getBreadcrumbSchema(null)).toBeNull();
    });

    it('returns null for undefined breadcrumbs', () => {
      // @ts-expect-error Deliberately verifies the runtime guard against undefined input.
      expect(getBreadcrumbSchema(undefined)).toBeNull();
    });

    it('handles single breadcrumb', () => {
      const breadcrumbs = [{ label: 'Home', href: '/' }];

      const schema = getBreadcrumbSchema(breadcrumbs);

      if (!schema) {
        throw new Error('Valid breadcrumbs produced no schema');
      }
      expect(schema.itemListElement).toHaveLength(1);
      expect(schema.itemListElement[0]?.position).toBe(1);
    });
  });
});
