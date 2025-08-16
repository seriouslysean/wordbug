/**
 * Shared help utilities for tools
 * Ensures consistent help formatting and DRY principles
 */

/**
 * Displays help text with consistent formatting
 * @param {string} helpText - Raw help text to display
 * @returns {void} Nothing
 */
export function showHelp(helpText: string): void {
  console.log(helpText.trim());
}

/**
 * Common environment variable documentation
 */
export const COMMON_ENV_DOCS = `
Common Environment Variables:
  SOURCE_DIR                 Data source directory (default: demo)
  DICTIONARY_ADAPTER         Dictionary API to use (default: wordnik)
  WORDNIK_API_KEY           API key for Wordnik dictionary
  SITE_TITLE                Site title for generated content
  SITE_URL                  Canonical site URL

Color Customization:
  COLOR_PRIMARY             Primary color (default: #9a3412)
  COLOR_PRIMARY_LIGHT       Light primary color (default: #c2410c)
  COLOR_PRIMARY_DARK        Dark primary color (default: #7c2d12)
`;

/**
 * Standard usage patterns for consistency
 */
export const USAGE_PATTERNS = {
  toolLocal: 'npm run tool:local tools/<tool-name>.ts',
  toolDirect: 'npm run tool:<tool-name>',
  helpFlag: '-h, --help',
} as const;