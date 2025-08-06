import { format, isValid, parse, startOfDay } from 'date-fns';

/**
 * Validate if a date string is in YYYYMMDD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True when the string represents a valid date
 */
export const isValidDate = (dateStr: string): boolean => {
  const date = parse(dateStr, 'yyyyMMdd', new Date());
  return isValid(date);
};

/**
 * Get today's date in YYYYMMDD format
 * @returns {string} Current date as YYYYMMDD
 */
export const getTodayYYYYMMDD = (): string => {
  return format(new Date(), 'yyyyMMdd');
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

  const date = parse(dateStr, 'yyyyMMdd', new Date());
  if (!isValid(date)) {
    return dateStr;
  }

  return format(date, 'MMM d, yyyy');
};

/**
 * Convert a Date object to a YYYYMMDD string
 * @param {Date} date - Date to convert
 * @returns {string} Converted date string
 */
export const dateToYYYYMMDD = (date: Date): string => {
  return format(date, 'yyyyMMdd');
};

/**
 * Convert a YYYYMMDD string to a Date object
 * @param {string} dateStr - Date string to convert
 * @returns {Date | null} Date object or null if invalid
 */
export const YYYYMMDDToDate = (dateStr: string): Date | null => {
  const date = parse(dateStr, 'yyyyMMdd', new Date());
  if (!isValid(date)) {
    return null;
  }
  return startOfDay(date);
};