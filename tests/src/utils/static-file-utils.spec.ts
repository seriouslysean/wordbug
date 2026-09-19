import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WordData } from '#types';

vi.mock('#utils/i18n-utils', () => ({
  t: (key: string, values: Record<string, unknown> = {}) =>
    key.replaceAll(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values[name] ?? name)),
  tp: (key: string, count: number, values: Record<string, unknown> = {}) =>
    `${key}_${Number(count) === 1 ? 'one' : 'other'}`
      .replaceAll(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(values[name] ?? (name === 'count' ? count : name))),
}));

import {
  generateHealthTxt,
  generateHumansTxt,
  generateLlmsTxt,
  generateRobotsTxt,
  getStaticFileContent,
} from '#astro-utils/static-file-utils';

const originalEnv = {
  SITE_TITLE: mockEnv.SITE_TITLE,
  SITE_DESCRIPTION: mockEnv.SITE_DESCRIPTION,
  SITE_URL: mockEnv.SITE_URL,
  HUMANS_WORD_CURATOR: mockEnv.HUMANS_WORD_CURATOR,
  HUMANS_DEVELOPER_NAME: mockEnv.HUMANS_DEVELOPER_NAME,
  HUMANS_DEVELOPER_CONTACT: mockEnv.HUMANS_DEVELOPER_CONTACT,
  HUMANS_DEVELOPER_SITE: mockEnv.HUMANS_DEVELOPER_SITE,
};

afterEach(() => {
  Object.assign(mockEnv, originalEnv);
});

const words: WordData[] = Array.from({ length: 6 }, (_, index) => {
  const day = String(21 - index).padStart(2, '0');
  return {
    word: `word${index + 1}`,
    date: `202501${day}`,
    adapter: 'wordnik',
    data: [{ text: `Definition ${index + 1}`, partOfSpeech: 'noun' }],
  };
});

describe('generateLlmsTxt', () => {
  it('lists newest words and applies BASE_PATH to every internal link', () => {
    mockEnv.BASE_PATH = '/demo';

    const output = generateLlmsTxt(words);
    const recentSection = output?.split('## Pages')[0] ?? '';

    expect(recentSection).toContain('- [word1](https://test.com/demo/word/word1): Jan 21, 2025');
    expect(recentSection).toContain('- [word5](https://test.com/demo/word/word5): Jan 17, 2025');
    expect(recentSection).not.toContain('[word6]');
    expect(output).toContain('](https://test.com/demo/word/word1)');
    expect(output).toContain('](https://test.com/demo/word)');
  });

  it('returns null when required site data is missing', () => {
    mockEnv.SITE_TITLE = '';

    expect(generateLlmsTxt(words)).toBeNull();
  });

  it('renders an empty recent section without an invented update date', () => {
    const output = generateLlmsTxt([]);

    expect(output).toContain('## Recent Words (Last 5)\n\n\n\n## Pages');
    expect(output).not.toContain('Last updated:');
  });
});

describe('generateRobotsTxt', () => {
  it('applies BASE_PATH to the sitemap URL', () => {
    mockEnv.BASE_PATH = '/demo';

    expect(generateRobotsTxt('https://test.com')).toContain('Sitemap: https://test.com/demo/sitemap-index.xml');
  });

  it('uses the argument and then the local fallback when SITE_URL is empty', () => {
    mockEnv.SITE_URL = '';

    expect(generateRobotsTxt('https://argument.test/')).toContain('Sitemap: https://argument.test/sitemap-index.xml');
    expect(generateRobotsTxt('')).toContain('Sitemap: http://localhost:4321/sitemap-index.xml');
  });
});

describe('generateHumansTxt', () => {
  it('includes only configured team fields', () => {
    mockEnv.HUMANS_WORD_CURATOR = 'A Curator';
    mockEnv.HUMANS_DEVELOPER_CONTACT = 'dev@example.test';

    const output = generateHumansTxt();

    expect(output).toContain('Word Curator: A Curator');
    expect(output).toContain('Contact: dev@example.test');
    expect(output).not.toContain('Developer:');
    expect(output).not.toContain('Site:');
    expect(output).toContain('/* THANKS */');
    expect(output).toContain('/* SITE */');
  });
});

describe('generateHealthTxt', () => {
  it('reports stable build and corpus fields with an ISO timestamp', () => {
    const output = generateHealthTxt(words);

    expect(output).toMatch(/^status: ok\ntimestamp: \d{4}-\d{2}-\d{2}T[^\n]+Z$/m);
    expect(output).toContain('version: test');
    expect(output).toContain('release: test');
    expect(output).toContain('build_time: 2000-01-01T00:00:00Z');
    expect(output).toContain('words_count: 6');
    expect(output).toMatch(/words_hash: [\da-f]{64}/);
  });
});

describe('getStaticFileContent', () => {
  it.each([
    ['/robots.txt', 'User-agent: *'],
    ['humans.txt', '/* TEAM */'],
    ['/health.txt', 'words_count: 6'],
    ['llms.txt', '# Test Site'],
  ])('dispatches %s with or without a leading slash', (pathname, expected) => {
    expect(getStaticFileContent(pathname, words, 'https://argument.test')).toContain(expected);
  });

  it('returns null for unsupported paths', () => {
    expect(getStaticFileContent('/unknown.txt', words)).toBeNull();
  });
});
