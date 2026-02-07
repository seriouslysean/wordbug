import { describe, expect, it } from 'vitest';

import {
 dateToYYYYMMDD, formatDate, formatISODate, getMonthNameFromDate, getMonthSlugFromDate, getTodayYYYYMMDD, isValidDate, MONTH_NAMES, monthSlugToNumber, YYYYMMDDToDate,
} from '#utils/date-utils';

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

  describe('formatISODate', () => {
    it('converts YYYYMMDD to ISO format correctly', () => {
      expect(formatISODate('20240319')).toBe('2024-03-19');
      expect(formatISODate('20251225')).toBe('2025-12-25');
    });

    it('handles single digit months and days', () => {
      expect(formatISODate('20240101')).toBe('2024-01-01');
      expect(formatISODate('20240905')).toBe('2024-09-05');
    });

    it('returns input string when format is invalid', () => {
      expect(formatISODate('2024')).toBe('2024');
      expect(formatISODate('invalid')).toBe('invalid');
      expect(formatISODate('')).toBe('');
    });

    it('handles leap year dates', () => {
      expect(formatISODate('20240229')).toBe('2024-02-29');
    });

    it('handles edge cases', () => {
      expect(formatISODate('20241231')).toBe('2024-12-31'); // Last day of year
      expect(formatISODate('20240301')).toBe('2024-03-01'); // First day of March
    });
  });

  describe('dateToYYYYMMDD', () => {
    it('converts Date object to YYYYMMDD format', () => {
      // March 19, 2024 (month is 0-indexed)
      const date = new Date(2024, 2, 19);
      expect(dateToYYYYMMDD(date)).toBe('20240319');
    });

    it('handles different months and days', () => {
      // January 1, 2024
      const date1 = new Date(2024, 0, 1);
      // December 25, 2024
      const date2 = new Date(2024, 11, 25);
      expect(dateToYYYYMMDD(date1)).toBe('20240101');
      expect(dateToYYYYMMDD(date2)).toBe('20241225');
    });

    it('handles leap year dates', () => {
      // February 29, 2024
      const date = new Date(2024, 1, 29);
      expect(dateToYYYYMMDD(date)).toBe('20240229');
    });
  });

  describe('YYYYMMDDToDate', () => {
    it('converts valid YYYYMMDD string to Date object', () => {
      const result = YYYYMMDDToDate('20240319');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2); // March is month 2 (0-indexed)
      expect(result?.getDate()).toBe(19);
    });

    it('handles different dates', () => {
      const date1 = YYYYMMDDToDate('20240101');
      const date2 = YYYYMMDDToDate('20241225');

      expect(date1?.getFullYear()).toBe(2024);
      expect(date1?.getMonth()).toBe(0); // January
      expect(date1?.getDate()).toBe(1);

      expect(date2?.getFullYear()).toBe(2024);
      expect(date2?.getMonth()).toBe(11); // December
      expect(date2?.getDate()).toBe(25);
    });

    it('returns null for invalid date strings', () => {
      expect(YYYYMMDDToDate('20240230')).toBe(null); // Feb 30 doesn't exist
      expect(YYYYMMDDToDate('invalid')).toBe(null);
      expect(YYYYMMDDToDate('')).toBe(null);
    });

    it('handles leap year dates', () => {
      const result = YYYYMMDDToDate('20240229');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(1); // February
      expect(result?.getDate()).toBe(29);
    });
  });

  describe('getMonthNameFromDate', () => {
    it('extracts month name from YYYYMMDD date string', () => {
      expect(getMonthNameFromDate('20250115')).toBe('January');
      expect(getMonthNameFromDate('20250628')).toBe('June');
      expect(getMonthNameFromDate('20251225')).toBe('December');
    });

    it('returns "Invalid Month" for invalid date strings', () => {
      expect(getMonthNameFromDate('invalid')).toBe('Invalid Month');
      expect(getMonthNameFromDate('20251301')).toBe('Invalid Month'); // Invalid month
    });
  });

  describe('getMonthSlugFromDate', () => {
    it('extracts lowercase month name from YYYYMMDD date string', () => {
      expect(getMonthSlugFromDate('20250115')).toBe('january');
      expect(getMonthSlugFromDate('20250628')).toBe('june');
      expect(getMonthSlugFromDate('20251225')).toBe('december');
    });

    it('returns "invalid month" for invalid date strings', () => {
      expect(getMonthSlugFromDate('invalid')).toBe('invalid month');
      expect(getMonthSlugFromDate('20251301')).toBe('invalid month');
    });
  });

  describe('monthSlugToNumber', () => {
    it('converts month slug to month number', () => {
      expect(monthSlugToNumber('january')).toBe(1);
      expect(monthSlugToNumber('june')).toBe(6);
      expect(monthSlugToNumber('december')).toBe(12);
    });

    it('handles case insensitive input', () => {
      expect(monthSlugToNumber('JANUARY')).toBe(1);
      expect(monthSlugToNumber('June')).toBe(6);
      expect(monthSlugToNumber('DeCeMbEr')).toBe(12);
    });

    it('returns null for invalid month slugs', () => {
      expect(monthSlugToNumber('invalid')).toBe(null);
      expect(monthSlugToNumber('month13')).toBe(null);
      expect(monthSlugToNumber('')).toBe(null);
    });
  });

  describe('MONTH_NAMES', () => {
    it('contains all 12 months in lowercase', () => {
      expect(MONTH_NAMES).toHaveLength(12);
      expect(MONTH_NAMES[0]).toBe('january');
      expect(MONTH_NAMES[11]).toBe('december');
    });

    it('contains expected month names in order', () => {
      const expected = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      expect(MONTH_NAMES).toEqual(expected);
    });
  });
});