import { describe, expect, it } from 'vitest';

import { getPronunciation, getSyllableCount } from '#utils/pronunciation-utils';
import { countSyllables } from '#utils/text-utils';

describe('pronunciation-utils', () => {
  describe('getPronunciation', () => {
    it('returns ARPABET, IPA, stress, and syllable count for a known word', () => {
      expect(getPronunciation('cat')).toEqual({
        arpabet: 'K AE1 T',
        ipa: 'kˈæt',
        stress: '1',
        syllableCount: 1,
      });
    });

    it('renders multi-syllable stress patterns and reduced vowels', () => {
      const result = getPronunciation('serendipity');
      expect(result?.stress).toBe('2-0-1-0-0');
      expect(result?.syllableCount).toBe(5);
      // Unstressed AH0 renders as schwa, IH1 carries the primary stress mark
      expect(result?.ipa).toBe('sˌɛɹəndˈɪpɪti');
    });

    it('is case-insensitive', () => {
      expect(getPronunciation('CAT')).toEqual(getPronunciation('cat'));
    });

    it('returns null for out-of-dictionary and empty input', () => {
      expect(getPronunciation('zzxqjk')).toBeNull();
      expect(getPronunciation('')).toBeNull();
    });
  });

  describe('getSyllableCount', () => {
    it('uses the CMU count when the word is in the dictionary', () => {
      expect(getSyllableCount('serendipity')).toBe(5);
    });

    it('falls back to the heuristic for out-of-dictionary words', () => {
      expect(getSyllableCount('zzxqjk')).toBe(countSyllables('zzxqjk'));
    });
  });
});
