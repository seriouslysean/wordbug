/**
 * Shared month names constant for consistent usage across the application
 */
export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

/**
 * Parse a YYYYMMDD string into a local-time Date. Returns null when the
 * string is not exactly 8 digits or represents an impossible calendar date
 * (e.g. Feb 30). Parsing uses local-time components to stay consistent with
 * dateToYYYYMMDD and the display formatters.
 */
const parseYYYYMMDD = (dateStr: string): Date | null => {
  // Digits only: parseInt would read '1x' as 1 and accept '2025011x' as Jan 1
  if (!/^\d{8}$/.test(dateStr)) {
    return null;
  }
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6)) - 1;
  const day = Number(dateStr.slice(6, 8));
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
};

/**
 * Validate if a date string is in YYYYMMDD format
 * @param dateStr - Date string to validate
 * @returns True when the string represents a valid date
 */
export const isValidDate = (dateStr: string): boolean => parseYYYYMMDD(dateStr) !== null;

/**
 * Get today's date in YYYYMMDD format
 * @returns Current date as YYYYMMDD
 */
export const getTodayYYYYMMDD = (): string => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

/**
 * Format a YYYYMMDD string into a human-friendly date
 * @param dateStr - Date string to format
 * @returns Formatted date or original string if invalid
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return dateStr;
  }
  const date = parseYYYYMMDD(dateStr);
  if (!date) {
    return dateStr;
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

/**
 * Convert YYYYMMDD string to ISO date format (YYYY-MM-DD) for HTML datetime attributes
 * @param dateStr - Date string in YYYYMMDD format
 * @returns ISO date string or original if invalid
 */
export const formatISODate = (dateStr: string): string => {
  if (!dateStr) {
    return dateStr;
  }
  const date = parseYYYYMMDD(dateStr);
  if (!date) {
    return dateStr;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Convert a Date object to a YYYYMMDD string
 * @param date - Date to convert
 * @returns Converted date string
 */
export const dateToYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

/**
 * Convert a YYYYMMDD string to a Date object
 * @param dateStr - Date string to convert
 * @returns Date object or null if invalid
 */
export const YYYYMMDDToDate = (dateStr: string): Date | null => parseYYYYMMDD(dateStr);

/**
 * Extracts month name from YYYYMMDD date string
 */
export const getMonthNameFromDate = (dateStr: string): string => {
  const date = YYYYMMDDToDate(dateStr);
  if (!date) {
    return 'Invalid Month';
  }
  const name = MONTH_NAMES[date.getMonth()];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Invalid Month';
};

/**
 * Extracts lowercase month name from YYYYMMDD date string for URLs
 */
export const getMonthSlugFromDate = (dateStr: string): string => {
  return getMonthNameFromDate(dateStr).toLowerCase();
};

/**
 * Converts month slug back to month number (1-12)
 */
export const monthSlugToNumber = (monthSlug: string): number | null => {
  const index = MONTH_NAMES.findIndex(name => name === monthSlug.toLowerCase());
  return index >= 0 ? index + 1 : null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Count calendar days from one YYYYMMDD date to another. Subtracting
 * local-midnight timestamps is wrong across a daylight-saving change (the
 * spring-forward day is 23 hours long), so the validated year/month/day are
 * mapped onto UTC, where every day is exactly 24 hours.
 * @param olderDate - Start date in YYYYMMDD format
 * @param newerDate - End date in YYYYMMDD format
 * @returns Whole days between the dates (negative when reversed), or null if either is invalid
 */
export const getCalendarDaysBetween = (olderDate: string, newerDate: string): number | null => {
  const dOlder = parseYYYYMMDD(olderDate);
  const dNewer = parseYYYYMMDD(newerDate);

  if (!dOlder || !dNewer) {
    return null;
  }

  const olderUTC = Date.UTC(dOlder.getFullYear(), dOlder.getMonth(), dOlder.getDate());
  const newerUTC = Date.UTC(dNewer.getFullYear(), dNewer.getMonth(), dNewer.getDate());
  return (newerUTC - olderUTC) / MS_PER_DAY;
};

export const areConsecutiveDays = (olderDate: string, newerDate: string): boolean =>
  getCalendarDaysBetween(olderDate, newerDate) === 1;
