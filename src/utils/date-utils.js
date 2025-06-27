import { logSentryError } from './sentry-client.js';

/**
 * Validates if a date string is in correct YYYYMMDD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid date format
 */
export const isValidDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {return false;}

  // Check basic format YYYYMMDD
  if (dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
    return false;
  }

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));

  // Basic range validation
  if (year < 1900 || year > 2100) {return false;}
  if (month < 1 || month > 12) {return false;}
  if (day < 1 || day > 31) {return false;}

  // Check if date is actually valid using Date constructor
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
};

/**
 * Formats a date string into a localized date
 * @param {string} dateStr - Date string in YYYYMMDD format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateStr) => {
  if (!dateStr) {return dateStr;}

  try {
    if (dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
      return dateStr;
    }

    const year = dateStr.substring(0, 4);
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    logSentryError('Error formatting date:', error);
    return dateStr;
  }
};
