import { format, isValid, parse, startOfDay } from 'date-fns';

/**
 * Shared month names constant for consistent usage across the application
 */
export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

/**
 * Validates if a date string is in correct YYYYMMDD format
 */
export const isValidDate = (dateStr: string): boolean => {
  const date = parse(dateStr, 'yyyyMMdd', new Date());
  return isValid(date);
};

/**
 * Gets the current date in YYYYMMDD format
 */
export const getTodayYYYYMMDD = (): string => {
  return format(new Date(), 'yyyyMMdd');
};

/**
 * Formats a date string into a localized date
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return dateStr;
  }

  const date = parse(dateStr, 'yyyyMMdd', new Date());
  if (!isValid(date)) {
    return dateStr;
  }

  return format(date, 'MMM d, yyyy');
};

/**
 * Converts a Date object to YYYYMMDD format string
 */
export const dateToYYYYMMDD = (date: Date): string => {
  return format(date, 'yyyyMMdd');
};

/**
 * Converts YYYYMMDD string to Date object
 */
export const YYYYMMDDToDate = (dateStr: string): Date | null => {
  const date = parse(dateStr, 'yyyyMMdd', new Date());
  if (!isValid(date)) {
    return null;
  }
  return startOfDay(date);
};

/**
 * Extracts month name from YYYYMMDD date string
 */
export const getMonthNameFromDate = (dateStr: string): string => {
  const date = YYYYMMDDToDate(dateStr);
  if (!date) {
    return 'Invalid Month';
  }
  return format(date, 'MMMM');
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
  const index = MONTH_NAMES.indexOf(monthSlug.toLowerCase() as typeof MONTH_NAMES[number]);
  return index >= 0 ? index + 1 : null;
};