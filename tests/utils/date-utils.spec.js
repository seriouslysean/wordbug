import { describe, expect, it } from 'vitest';

import { formatDate, getTodayYYYYMMDD, isValidDate } from '~utils/date-utils';

describe('shared date-utils', () => {
  describe('getTodayYYYYMMDD', () => {
    it('returns current date in YYYYMMDD format', () => {
      const result = getTodayYYYYMMDD();
      expect(result).toMatch(/^\d{8}$/);
      expect(result.length).toBe(8);
    });

    it('returns a valid date string', () => {
      const result = getTodayYYYYMMDD();
      expect(isValidDate(result)).toBe(true);
    });
  });

  describe('isValidDate', () => {
    it('validates correct YYYYMMDD dates', () => {
      expect(isValidDate('20240319')).toBe(true);
      expect(isValidDate('20251225')).toBe(true);
      expect(isValidDate('20240101')).toBe(true);
    });

    it('handles leap year dates', () => {
      expect(isValidDate('20240229')).toBe(true); // 2024 is leap year
      expect(isValidDate('20230229')).toBe(false); // 2023 is not leap year
    });

    it('rejects invalid dates', () => {
      expect(isValidDate('20240230')).toBe(false); // Feb 30 doesn't exist
      expect(isValidDate('20241301')).toBe(false); // Month 13 doesn't exist
      expect(isValidDate('20240001')).toBe(false); // Day 0 doesn't exist
    });

    it('rejects invalid formats', () => {
      expect(isValidDate('2024')).toBe(false);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-03-19')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('formats a valid date string correctly', () => {
      expect(formatDate('20240319')).toBe('Mar 19, 2024');
      expect(formatDate('20251225')).toBe('Dec 25, 2025');
    });

    it('handles single digit months and days', () => {
      expect(formatDate('20240101')).toBe('Jan 1, 2024');
      expect(formatDate('20240905')).toBe('Sep 5, 2024');
    });

    it('returns input string when format is invalid', () => {
      expect(formatDate('2024')).toBe('2024');
      expect(formatDate('invalid')).toBe('invalid');
    });

    it('handles leap year dates', () => {
      expect(formatDate('20240229')).toBe('Feb 29, 2024');
    });
  });
});