import { format, isValid, parse, startOfDay } from 'date-fns';

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