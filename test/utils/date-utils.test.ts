import { describe, it, expect } from 'vitest';
import { formatDate } from '~utils/date-utils.js';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('formats a valid date string correctly', () => {
      expect(formatDate('20240319')).toBe('Mar 19, 2024');
      expect(formatDate('20251225')).toBe('Dec 25, 2025');
    });

    it('handles single digit months and days', () => {
      expect(formatDate('20240101')).toBe('Jan 1, 2024');
      expect(formatDate('20240905')).toBe('Sep 5, 2024');
    });

    // Note: In actual usage, we only pass valid YYYYMMDD strings
    // These tests verify current behavior for documentation purposes
    it('returns input string when format is invalid', () => {
      expect(formatDate('2024')).toBe('2024');
      expect(formatDate('invalid')).toBe('invalid');
    });

    it('handles leap year dates', () => {
      expect(formatDate('20240229')).toBe('Feb 29, 2024');
    });
  });
});
