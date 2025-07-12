import { format, isValid, parse, startOfDay } from 'date-fns';

import { logger } from './logger';

/**
 * Validates if a date string is in correct YYYYMMDD format
 */
export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
    return false;
  }

  try {
    const date = parse(dateStr, 'yyyyMMdd', new Date());
    return isValid(date);
  } catch {
    return false;
  }
};

/**
 * Converts a Date object to YYYYMMDD format string
 */
export const dateToYYYYMMDD = (date: Date): string | null => {
  if (!date || !(date instanceof Date) || !isValid(date)) {
    logger.warn('Invalid date provided to dateToYYYYMMDD', { date });
    return null;
  }

  try {
    return format(date, 'yyyyMMdd');
  } catch (error) {
    logger.error('Failed to format date to YYYYMMDD', { date, error: (error as Error).message });
    return null;
  }
};

/**
 * Converts YYYYMMDD string to Date object
 */
export const YYYYMMDDToDate = (dateStr: string): Date | null => {
  if (!isValidDate(dateStr)) {
    logger.warn('Invalid date string provided to YYYYMMDDToDate', { dateStr });
    return null;
  }

  try {
    const date = parse(dateStr, 'yyyyMMdd', new Date());
    return startOfDay(date); // Normalize to midnight
  } catch (error) {
    logger.error('Failed to parse YYYYMMDD date string', { dateStr, error: (error as Error).message });
    return null;
  }
};

/**
 * Formats a date string into a localized date
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return dateStr;
  }

  try {
    const date = YYYYMMDDToDate(dateStr);
    if (!date) {
      return dateStr;
    }

    return format(date, 'MMM d, yyyy');
  } catch (error) {
    logger.error('Failed to format date string', { dateStr, error: (error as Error).message });
    return dateStr;
  }
};

/**
 * Validates if a date string is in YYYY-MM-DD format
 */
export const isValidDateISO = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isValid(date) && format(date, 'yyyy-MM-dd') === dateStr;
  } catch {
    return false;
  }
};

/**
 * Gets the current date in YYYYMMDD format
 */
export const getTodayYYYYMMDD = (): string | null => {
  return dateToYYYYMMDD(new Date());
};
