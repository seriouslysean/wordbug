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
  if (!dateStr || dateStr.length !== 8) {
    return null;
  }
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = parseInt(dateStr.slice(6, 8), 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
};

/**
 * Validate if a date string is in YYYYMMDD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True when the string represents a valid date
 */
export const isValidDate = (dateStr: string): boolean => parseYYYYMMDD(dateStr) !== null;

/**
 * Get today's date in YYYYMMDD format
 * @returns {string} Current date as YYYYMMDD
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
 * @param {string} dateStr - Date string to format
 * @returns {string} Formatted date or original string if invalid
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
 * @param {string} dateStr - Date string in YYYYMMDD format
 * @returns {string} ISO date string or original if invalid
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
 * @param {Date} date - Date to convert
 * @returns {string} Converted date string
 */
export const dateToYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

/**
 * Convert a YYYYMMDD string to a Date object
 * @param {string} dateStr - Date string to convert
 * @returns {Date | null} Date object or null if invalid
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

export const areConsecutiveDays = (olderDate: string, newerDate: string): boolean => {
  const dOlder = YYYYMMDDToDate(olderDate);
  const dNewer = YYYYMMDDToDate(newerDate);

  if (!dOlder || !dNewer) {
    return false;
  }

  const diffTime = dNewer.getTime() - dOlder.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
};
