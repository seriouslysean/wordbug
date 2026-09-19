/**
 * Shared help utilities for tools
 * Ensures consistent help formatting and DRY principles
 */
import { parseArgs } from 'node:util';
import type { ParseArgsConfig } from 'node:util';

import { exit, getErrorMessage, logger } from '#utils/logger';

// The codes util.parseArgs throws for a command line it cannot parse: an
// unknown option, an option missing its value or given one it does not take,
// a positional argument the tool does not accept.
const isParseArgsError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
  && error.code.startsWith('ERR_PARSE_ARGS_');

/**
 * Parses a tool's command line with util.parseArgs. A command line it cannot
 * parse (a mistyped option such as --batchsize=5) is the operator's input,
 * refused as the tools refuse their other input: one line at warn, which the
 * CLI logger does not forward to Sentry, naming the problem and pointing to
 * --help, then exit 1. util.parseArgs would otherwise throw it as an
 * uncaught stack trace.
 * @param config - The util.parseArgs configuration
 * @returns The parsed values and positionals
 */
export async function parseToolArgs<T extends ParseArgsConfig>(config: T): Promise<ReturnType<typeof parseArgs<T>>> {
  try {
    return parseArgs(config);
  } catch (error) {
    if (!isParseArgsError(error)) {
      throw error;
    }
    logger.warn(getErrorMessage(error), { help: 'Run with --help to list the options' });
    return exit(1);
  }
}

/**
 * Displays help text with consistent formatting
 * @param helpText - Raw help text to display
 * @returns Nothing
 */
export function showHelp(helpText: string): void {
  console.log(helpText.trim());
}

/**
 * Common environment variable documentation
 */
export const COMMON_ENV_DOCS = `
Common Environment Variables:
  SOURCE_DIR                 Data source subdirectory (unset = root paths)
  DICTIONARY_ADAPTER         Dictionary API to use (default: wordnik)
  DICTIONARY_FALLBACK        Fallback chain, comma-separated (default: wiktionary, none: disabled)
  WORDNIK_API_KEY           API key for Wordnik dictionary
  MERRIAM_WEBSTER_API_KEY   API key for Merriam-Webster dictionary
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