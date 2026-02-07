import { describe, it, expect, vi } from 'vitest';
import { generateBreadcrumbs } from '../../utils/breadcrumb-utils';

// Mock the page metadata utility
vi.mock('../../utils/page-metadata-utils', () => ({
  getPageTitle: vi.fn((path) => {
    const titleMap = {
      '/words': 'All Words',
      '/stats': 'Statistics',
      '/words/2024': '2024',
      '/words/hello': 'hello',
      '/words/letter': 'Browse by Letter',
      '/words/letter/a': 'Words starting with A',
      '/words/length': 'Browse by Length',
      '/words/length/5': '5-letter words',
      '/stats/palindromes': 'Palindromes',
    };
    return titleMap[path] || null;
  })
}));

describe('generateBreadcrumbs', () => {
  it('should return empty array for home page', () => {
    expect(generateBreadcrumbs('/')).toEqual([]);
    expect(generateBreadcrumbs('')).toEqual([]);
  });

  it('should generate breadcrumbs for a word page', () => {
    const result = generateBreadcrumbs('/words/hello');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: 'hello', href: '/words/hello' }
    ]);
  });

  it('should generate breadcrumbs for a year page', () => {
    const result = generateBreadcrumbs('/words/2024');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: '2024', href: '/words/2024' }
    ]);
  });

  it('should generate breadcrumbs for a stats page', () => {
    const result = generateBreadcrumbs('/stats/palindromes');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'statistics', href: '/stats' },
      { label: 'palindromes', href: '/stats/palindromes' }
    ]);
  });

  it('should handle base path correctly', () => {
    const result = generateBreadcrumbs('/blog/words/hello', '/blog');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: 'hello', href: '/words/hello' }
    ]);
  });

  it('should handle letter browsing pages', () => {
    const result = generateBreadcrumbs('/words/letter/a');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: 'browse by letter', href: '/words/letter' },
      { label: 'words starting with a', href: '/words/letter/a' }
    ]);
  });

  it('should handle length browsing pages', () => {
    const result = generateBreadcrumbs('/words/length/5');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: 'browse by length', href: '/words/length' },
      { label: '5-letter words', href: '/words/length/5' }
    ]);
  });

  it('should use segment as label when metadata is not available', () => {
    const result = generateBreadcrumbs('/unknown/path');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'unknown', href: '/unknown' },
      { label: 'path', href: '/unknown/path' }
    ]);
  });

  it('should handle trailing slashes', () => {
    const result = generateBreadcrumbs('/words/');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' }
    ]);
  });

  it('should handle multiple slashes correctly', () => {
    const result = generateBreadcrumbs('//words//hello//');
    expect(result).toEqual([
      { label: 'home', href: '/' },
      { label: 'all words', href: '/words' },
      { label: 'hello', href: '/words/hello' }
    ]);
  });
});