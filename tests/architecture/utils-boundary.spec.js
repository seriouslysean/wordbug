/**
 * Architecture tests to enforce the Node.js / Astro boundary
 *
 * These tests prevent boundary violations by ensuring:
 * 1. Node.js-side code (utils/, adapters/, tools/, constants/, config/) never
 *    imports Astro-only modules (#astro-utils/*, astro:*, @sentry/astro)
 * 2. Delegated logic is imported from utils/, not duplicated in src/utils/
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const UTILS_DIR = path.join(process.cwd(), 'utils');
const SRC_UTILS_DIR = path.join(process.cwd(), 'src', 'utils');
const NODE_SIDE_DIRS = ['utils', 'adapters', 'constants', 'config'].map(
  dir => path.join(process.cwd(), dir),
);

describe('Architecture: utils/ boundary enforcement', () => {
  it('Node.js-side code must not import Astro-only modules', () => {
    for (const dir of NODE_SIDE_DIRS) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      const tsFiles = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

      for (const file of tsFiles) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = `${path.basename(dir)}/${file}`;

        expect(
          content.match(/from ['"]#astro-utils\//g),
          `${label} imports from #astro-utils/* (breaks CLI tools)`,
        ).toBeNull();
        expect(
          content.match(/from ['"]astro:/g),
          `${label} imports from astro:* (breaks CLI tools)`,
        ).toBeNull();
        expect(
          content.match(/from ['"]@sentry\/astro['"]/g),
          `${label} imports @sentry/astro (breaks CLI tools)`,
        ).toBeNull();
      }
    }
  });

  it('src/utils/word-data-utils.ts must import filtering functions from utils/', () => {
    const filePath = path.join(SRC_UTILS_DIR, 'word-data-utils.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // These functions should be imported, not duplicated
    const requiredImports = [
      'getWordsByLength',
      'getWordsByLetter',
      'getWordsByPartOfSpeech',
      'getAvailableYears',
      'getAvailableMonths',
      'getAvailableLetters',
      'getAvailablePartsOfSpeech',
    ];

    for (const fnName of requiredImports) {
      const importPattern = new RegExp(`import.*${fnName}.*from ['"]#utils/word-data-utils['"]`, 's');
      expect(content).toMatch(importPattern,
        `${fnName} should be imported from #utils/word-data-utils, not duplicated`);
    }
  });

  it('src/utils/word-data-utils.ts must not duplicate filtering logic', () => {
    const srcFile = path.join(SRC_UTILS_DIR, 'word-data-utils.ts');
    const utilsFile = path.join(UTILS_DIR, 'word-data-utils.ts');

    const srcContent = fs.readFileSync(srcFile, 'utf-8');
    const utilsContent = fs.readFileSync(utilsFile, 'utf-8');

    // Extract function implementations from utils/ for comparison
    const utilsFunctions = {
      getWordsByLength: /export const getWordsByLength[\s\S]*?^};/m.exec(utilsContent)?.[0] || '',
      getWordsByLetter: /export const getWordsByLetter[\s\S]*?^};/m.exec(utilsContent)?.[0] || '',
      getWordsByPartOfSpeech: /export const getWordsByPartOfSpeech[\s\S]*?^};/m.exec(utilsContent)?.[0] || '',
    };

    // Check that src/utils versions are thin wrappers, not duplicates
    for (const [fnName, utilsImpl] of Object.entries(utilsFunctions)) {
      if (!utilsImpl) {
        continue;
      }

      // Extract the filtering logic from utils/ implementation
      const filterLogic = utilsImpl.match(/words\.filter\([\s\S]*?\)/)?.[0];

      if (filterLogic) {
        // Check if this exact filtering logic appears in src/utils (would be duplication)
        const isDuplicated = srcContent.includes(filterLogic);
        expect(isDuplicated,
          `${fnName} appears to duplicate filtering logic instead of importing from utils/`
        ).toBe(false);
      }
    }
  });

  it('Node.js-side code can only import from allowed alias paths', () => {
    const allowedPrefixes = ['#utils', '#types', '#constants', '#config', '#locales', '#adapters', '#tools'];

    for (const dir of NODE_SIDE_DIRS) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      const tsFiles = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

      for (const file of tsFiles) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = `${path.basename(dir)}/${file}`;

        const imports = content.match(/from ['"]#[^'"]+['"]/g) || [];

        for (const importStatement of imports) {
          const hasAllowedPrefix = allowedPrefixes.some(allowed =>
            importStatement.includes(`'${allowed}`) || importStatement.includes(`"${allowed}`)
          );

          expect(hasAllowedPrefix,
            `${label} has import ${importStatement} which doesn't match allowed prefixes: ${allowedPrefixes.join(', ')}`
          ).toBe(true);
        }
      }
    }
  });
});
