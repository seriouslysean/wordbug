import { dateToYYYYMMDD } from '#utils/date-utils';

/** One day cell in a year grid. `date` is null for leading-weekday padding. */
export interface ActivityCell {
  date: string | null;
  active: boolean;
}

export interface YearActivity {
  year: string;
  total: number;
  // Uniform column (week) count shared by every year in the result, so all
  // grids align at the same width; each year is exactly `columns` x 7 cells.
  columns: number;
  cells: ActivityCell[];
}

// A calendar year spans at most 54 week-columns (366 days + up to 6 leading
// padding days = 372 cells = 54 columns); used to bound the uniform width.
const MAX_CALENDAR_COLUMNS = 54;

/**
 * Builds one calendar-year activity grid per year present in the data, anchored
 * Jan 1–Dec 31 with leading-weekday padding so a CSS grid (7 rows, column flow)
 * renders a GitHub-style heatmap. Every year is padded to the same column count
 * (the widest year, capped at 54) with trailing nulls, so the grids align at a
 * shared width. Deterministic: only years with words are produced and no
 * current-date is read, so demo and production render stably.
 */
export const buildActivityCalendar = (dates: string[]): YearActivity[] => {
  const activeDates = new Set(dates);
  const years = [...new Set(dates.map(date => date.slice(0, 4)))].toSorted();

  // First pass: build each year's leading-padded day cells.
  const grids = years.map(year => {
    const cells: ActivityCell[] = [];
    const yearNum = Number(year);

    // Pad so Jan 1 lands on its real weekday (0 = Sunday) in the first column.
    const leadingDays = new Date(yearNum, 0, 1).getDay();
    for (let i = 0; i < leadingDays; i++) {
      cells.push({ date: null, active: false });
    }

    // Day 0 = Jan 1; advancing the day index rolls months automatically. Stop
    // once the date crosses into the next year (handles 365 vs 366).
    for (let day = 0; day < 366; day++) {
      const date = new Date(yearNum, 0, 1 + day);
      if (date.getFullYear() !== yearNum) {
        break;
      }
      const ymd = dateToYYYYMMDD(date);
      cells.push({ date: ymd, active: activeDates.has(ymd) });
    }

    return { year, cells };
  });

  // Second pass: take the widest year's column count as the uniform width, then
  // pad every year with trailing nulls to that exact `columns` x 7 cell count.
  const columns = Math.min(
    MAX_CALENDAR_COLUMNS,
    Math.max(0, ...grids.map(grid => Math.ceil(grid.cells.length / 7))),
  );

  return grids.map(({ year, cells }) => {
    const total = cells.filter(cell => cell.active).length;
    const padded = [...cells];
    while (padded.length < columns * 7) {
      padded.push({ date: null, active: false });
    }
    return { year, total, columns, cells: padded };
  });
};
