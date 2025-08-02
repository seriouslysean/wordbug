/**
 * Shared help utilities for tools
 * Ensures consistent help formatting and DRY principles
 */

/**
 * Displays help text with consistent formatting
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
  COLOR_PRIMARY             Primary color (default: #b45309)
  COLOR_PRIMARY_LIGHT       Light primary color (default: #d97706)
  COLOR_PRIMARY_DARK        Dark primary color (default: #78350f)
`;

/**
 * Standard usage patterns for consistency
 */
export const USAGE_PATTERNS = {
  toolLocal: 'npm run tool:local tools/<tool-name>.ts',
  toolDirect: 'npm run tool:<tool-name>',
  helpFlag: '-h, --help',
} as const;