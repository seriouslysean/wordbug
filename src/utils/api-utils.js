import { decodeHTML } from 'entities';
import { isValidDate } from './date-utils.js';
import { logSentryError } from './sentry-client.js';
import logger from './logger.js';

/**
 * Common constants for Wordnik API integration
 */
export const WORDNIK_CONFIG = {
  BASE_URL: 'https://api.wordnik.com/v4/word.json',
  DEFAULT_LIMIT: 10,
  RATE_LIMIT_DELAY: 1000,
  RATE_LIMIT_BACKOFF: 65000,
};

/**
 * Validates required environment variables
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variable is missing
 */
export function validateEnvironment(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// isValidDate is now imported from date-utils.js
export { isValidDate };

/**
 * Sanitizes HTML by processing <xref> tags and decoding HTML entities
 * @param {string} htmlString - HTML string to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.preserveXrefs - Whether to convert xrefs to links (default: true)
 * @param {string} options.xrefBaseUrl - Base URL for xref links (default: Wordnik)
 * @returns {string} - Sanitized string
 */
export function sanitizeHTML(htmlString, options = {}) {
  if (typeof htmlString !== 'string') {return htmlString;}

  const {
    preserveXrefs = true,
    xrefBaseUrl = 'https://www.wordnik.com/words',
  } = options;

  let result = htmlString;

  if (preserveXrefs) {
    // Convert <xref> tags to proper links
    result = result.replace(/<xref[^>]*>(.*?)<\/xref>/g, (_match, word) => {
      const cleanWord = word.trim();
      const url = `${xrefBaseUrl}/${encodeURIComponent(cleanWord.toLowerCase())}`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="xref-link">${cleanWord}</a>`;
    });
  } else {
    // Remove <xref> tags but keep their content (legacy behavior)
    result = result.replace(/<xref[^>]*>(.*?)<\/xref>/g, '$1');
  }

  // Decode HTML entities if present
  if (result.includes('&')) {
    result = decodeHTML(result);
  }

  return result;
}


/**
 * Unified function to fetch word data from Wordnik API
 * Always uses lowercase for API request but preserves original word for display
 * @param {string} word - Word to fetch data for (will be lowercased for API)
 * @param {number} limit - Number of definitions to fetch
 * @returns {Promise<Object>} - Word data from API with original word preserved
 * @throws {Error} - If API request fails
 */
export async function fetchWordData(word, limit = WORDNIK_CONFIG.DEFAULT_LIMIT) {
  validateEnvironment(['WORDNIK_API_KEY']);

  const apiKey = process.env.WORDNIK_API_KEY;
  const lowercaseWord = word.toLowerCase(); // Always use lowercase for API
  const url = `${WORDNIK_CONFIG.BASE_URL}/${encodeURIComponent(lowercaseWord)}/definitions?limit=${limit}&includeRelated=false&useCanonical=false&includeTags=false&api_key=${apiKey}`;

  const response = await fetch(url);

  // Log rate limit headers for monitoring
  const rateLimits = {
    remainingMinute: response.headers.get('x-ratelimit-remaining-minute'),
    remainingHour: response.headers.get('x-ratelimit-remaining-hour'),
    limitMinute: response.headers.get('x-ratelimit-limit-minute'),
    limitHour: response.headers.get('x-ratelimit-limit-hour'),
  };

  // Log rate limits for development monitoring
  if (import.meta.env.DEV) {
    logger.info('Wordnik API Rate Limits:', rateLimits);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Remaining: ${rateLimits.remainingMinute} per minute, ${rateLimits.remainingHour} per hour.`);
    }
    if (response.status === 404) {
      throw new Error(`Word "${word}" not found in dictionary. Please check the spelling.`);
    }
    // Use logSentryError for all error logging in this file
    logSentryError(new Error(`Failed to fetch word data: ${response.statusText}`));
    throw new Error(`Failed to fetch word data: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No word data found');
  }

  return data;
}
