import { describe, expect, it } from 'vitest';

import { getFrequencyBand, getWordFrequency } from '#utils/word-frequency-utils';

describe('word-frequency-utils', () => {
  describe('getWordFrequency', () => {
    it('returns a positive count for common words', () => {
      expect(getWordFrequency('the')).toBeGreaterThan(0);
    });

    it('is case-insensitive', () => {
      expect(getWordFrequency('THE')).toBe(getWordFrequency('the'));
    });

    it('returns null for out-of-dataset and empty input', () => {
      expect(getWordFrequency('zzxqjk')).toBeNull();
      expect(getWordFrequency('')).toBeNull();
    });
  });

  describe('getFrequencyBand', () => {
    it('bands very common words as common with a high Zipf score', () => {
      const result = getFrequencyBand('the');
      expect(result.band).toBe('common');
      expect(result.inDataset).toBe(true);
      expect(result.zipf).toBeCloseTo(7.48, 1);
    });

    it('bands a mid-frequency word as common', () => {
      expect(getFrequencyBand('cat').band).toBe('common');
    });

    it('bands an uncommon dictionary word as rare', () => {
      const result = getFrequencyBand('serendipity');
      expect(result.band).toBe('rare');
      expect(result.zipf).toBeCloseTo(2.77, 1);
    });

    it('bands a very low-frequency word as very-rare', () => {
      expect(getFrequencyBand('quotidian').band).toBe('very-rare');
    });

    it('treats out-of-dataset words as very-rare with null metrics', () => {
      const result = getFrequencyBand('zzxqjk');
      expect(result).toEqual({ band: 'very-rare', zipf: null, count: null, inDataset: false });
    });

    it('is case-insensitive', () => {
      expect(getFrequencyBand('THE').band).toBe(getFrequencyBand('the').band);
    });
  });
});
