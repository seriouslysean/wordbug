import { describe, expect, it } from 'vitest';

import { buildActivityCalendar } from '#utils/calendar-utils';

describe('calendar-utils', () => {
  describe('buildActivityCalendar', () => {
    it('returns one grid per year present, sorted ascending', () => {
      const calendars = buildActivityCalendar(['20240220', '20230115']);
      expect(calendars.map(c => c.year)).toEqual(['2023', '2024']);
    });

    it('emits one dated cell per calendar day (handles leap years)', () => {
      const [year2024] = buildActivityCalendar(['20240101']);
      expect(year2024.cells.filter(cell => cell.date).length).toBe(366);

      const [year2023] = buildActivityCalendar(['20230101']);
      expect(year2023.cells.filter(cell => cell.date).length).toBe(365);
    });

    it('pads leading cells so Jan 1 lands on its weekday', () => {
      const [year2024] = buildActivityCalendar(['20240101']);
      const leading = year2024.cells.filter((cell, index) => cell.date === null && index < 7).length;
      expect(leading).toBe(new Date(2024, 0, 1).getDay());
    });

    it('marks active days and totals them', () => {
      const [year] = buildActivityCalendar(['20240220', '20240221']);
      expect(year.total).toBe(2);
      const active = year.cells.find(cell => cell.date === '20240220');
      expect(active?.active).toBe(true);
      const inactive = year.cells.find(cell => cell.date === '20240222');
      expect(inactive?.active).toBe(false);
    });

    it('isolates years (a 2023 date does not leak into 2024)', () => {
      const calendars = buildActivityCalendar(['20231231', '20240101']);
      expect(calendars.find(c => c.year === '2023')?.total).toBe(1);
      expect(calendars.find(c => c.year === '2024')?.total).toBe(1);
    });

    it('pads every year to a uniform columns x 7 grid (capped at 54)', () => {
      const calendars = buildActivityCalendar(['20230101', '20240101', '20250101']);
      const columns = calendars.map(c => c.columns);
      // All years share one column count, so the grids align at the same width.
      expect(new Set(columns).size).toBe(1);
      expect(columns[0]).toBeLessThanOrEqual(54);
      // Trailing nulls bring each year to exactly columns x 7 cells.
      for (const calendar of calendars) {
        expect(calendar.cells.length).toBe(calendar.columns * 7);
      }
    });

    it('returns an empty array for no dates', () => {
      expect(buildActivityCalendar([])).toEqual([]);
    });
  });
});
