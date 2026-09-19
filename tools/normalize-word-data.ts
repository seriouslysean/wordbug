import fs from 'node:fs';
import path from 'node:path';

import { paths } from '#config/paths';
import { isEntryPoint } from '#tools/entry';
import { parseToolArgs, showHelp } from '#tools/help-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';
import { normalizeWordData } from '#utils/word-data-normalizer';

const HELP_TEXT = `
Normalize Word Data Tool

Rewrites stored word files to the canonical dictionary definition format.
This is an offline migration and never calls a dictionary API.

Usage:
  npm run tool:normalize-word-data -- [options]

Options:
  --dry-run                  Report changes without writing files
  -h, --help                Show this help message

Environment Variables:
  SOURCE_DIR                 Data source subdirectory (unset = root paths)
`;

interface PendingWrite {
  filePath: string;
  contents: string;
}

export function normalizeStoredWords(dryRun: boolean): number {
  if (!fs.existsSync(paths.words)) {
    logger.error('Words directory does not exist', { path: paths.words });
    return 1;
  }

  const files = fs.globSync('**/*.json', { cwd: paths.words }).toSorted();
  if (files.length === 0) {
    logger.error('No word files found', { path: paths.words });
    return 1;
  }

  const pending: PendingWrite[] = [];
  const failures: string[] = [];
  const review: string[] = [];

  for (const relativePath of files) {
    const filePath = path.join(paths.words, relativePath);
    try {
      const original = fs.readFileSync(filePath, 'utf8');
      const parsed: unknown = JSON.parse(original);
      const normalized = normalizeWordData(parsed, filePath);
      const contents = `${JSON.stringify(normalized.word, null, 4)}${original.endsWith('\n') ? '\n' : ''}`;
      if (contents !== original) {
        pending.push({ filePath, contents });
      }
      if (normalized.needsClassificationReview) {
        review.push(filePath);
        logger.warn('Word has no classified definitions; review manually', {
          word: normalized.word.word,
          file: filePath,
        });
      }
    } catch (error) {
      failures.push(filePath);
      logger.error('Failed to normalize word file', { file: filePath, error: getErrorMessage(error) });
    }
  }

  if (failures.length > 0) {
    logger.error('Normalization stopped without writing files', { failed: failures.length });
  } else {
    for (const item of pending) {
      if (!dryRun) {
        fs.writeFileSync(item.filePath, item.contents);
      }
      logger.info(dryRun ? 'Would normalize word file' : 'Normalized word file', { file: item.filePath });
    }
  }

  logger.info('Word data normalization complete', {
    total: files.length,
    changed: pending.length,
    unchanged: files.length - pending.length - failures.length,
    review: review.length,
    errors: failures.length,
    dryRun,
  });
  return failures.length;
}

if (isEntryPoint(import.meta.url)) {
  const { values } = await parseToolArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (values.help) {
    showHelp(HELP_TEXT);
    process.exit(0);
  }

  const run = async (): Promise<void> => {
    const failed = normalizeStoredWords(!!values['dry-run']);
    if (failed > 0) {
      await exit(1);
    }
  };

  run().catch(async (error: unknown) => {
    logger.error('Normalization tool failed', { error: getErrorMessage(error) });
    await exit(1);
  });
}
