import { describe, expect, it, vi } from 'vitest';

vi.mock('~astro-utils/word-data-utils', () => ({
  generateWordDataHash: vi.fn((words) => `hash-of-${words.length}-words`),
}));

import { getBuildData } from '~astro-utils/build-utils';

describe('build-utils', () => {
  describe('getBuildData', () => {
    it('returns build data with version and release from build-time defines', () => {
      const mockWords = [
        { word: 'test', date: '20240101' },
        { word: 'example', date: '20240102' },
      ];

      const buildData = getBuildData(mockWords);

      expect(buildData).toHaveProperty('version');
      expect(buildData).toHaveProperty('release');
      expect(buildData).toHaveProperty('timestamp');
      expect(buildData).toHaveProperty('wordsCount');
      expect(buildData).toHaveProperty('wordsHash');
    });

    it('includes correct word count', () => {
      const mockWords = [
        { word: 'test', date: '20240101' },
        { word: 'example', date: '20240102' },
        { word: 'sample', date: '20240103' },
      ];

      const buildData = getBuildData(mockWords);

      expect(buildData.wordsCount).toBe(3);
    });

    it('generates hash from word list', () => {
      const mockWords = [
        { word: 'test', date: '20240101' },
        { word: 'example', date: '20240102' },
      ];

      const buildData = getBuildData(mockWords);

      expect(buildData.wordsHash).toBe('hash-of-2-words');
    });

    it('handles empty word list', () => {
      const buildData = getBuildData([]);

      expect(buildData.wordsCount).toBe(0);
      expect(buildData.wordsHash).toBe('hash-of-0-words');
    });

    it('uses build-time constants for version and release', () => {
      const mockWords = [{ word: 'test', date: '20240101' }];

      const buildData = getBuildData(mockWords);

      expect(typeof buildData.version).toBe('string');
      expect(typeof buildData.release).toBe('string');
      expect(typeof buildData.timestamp).toBe('string');
    });
  });
});
