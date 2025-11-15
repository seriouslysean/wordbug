/**
 * Architecture tests to enforce the utils/ <-> src/utils/ boundary
 *
 * These tests prevent DRY violations by ensuring:
 * 1. utils/ files don't import from src/utils/ or Astro modules
 * 2. Duplicated logic is detected between the two directories
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const UTILS_DIR = path.join(process.cwd(), 'utils');
const SRC_UTILS_DIR = path.join(process.cwd(), 'src', 'utils');

describe('Architecture: utils/ boundary enforcement', () => {
  it('utils/ files must not import from ~astro-utils/*', () => {
    const utilsFiles = fs.readdirSync(UTILS_DIR).filter(f => f.endsWith('.ts'));

    for (const file of utilsFiles) {
      const filePath = path.join(UTILS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for forbidden imports
      const astroImports = content.match(/from ['"]~astro-utils\//g);
      const srcImports = content.match(/from ['"]~src\//g);
      const astroProtocol = content.match(/from ['"]astro:/g);

      expect(astroImports, `${file} imports from ~astro-utils/* (breaks CLI tools)`).toBeNull();
      expect(srcImports, `${file} imports from ~src/* (breaks CLI tools)`).toBeNull();
      expect(astroProtocol, `${file} imports from astro:* (breaks CLI tools)`).toBeNull();
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
      const importPattern = new RegExp(`import.*${fnName}.*from ['"]~utils/word-data-utils['"]`, 's');
      expect(content).toMatch(importPattern,
        `${fnName} should be imported from ~utils/word-data-utils, not duplicated`);
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
      if (!utilsImpl) continue;

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

  it('utils/ files can only import from allowed paths', () => {
    const utilsFiles = fs.readdirSync(UTILS_DIR).filter(f => f.endsWith('.ts'));
    const allowedPrefixes = ['~utils', '~types', '~constants', '~config', '~locales'];

    for (const file of utilsFiles) {
      const filePath = path.join(UTILS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Find all imports from ~alias paths
      const imports = content.match(/from ['"]~[^'"]+['"]/g) || [];

      for (const importStatement of imports) {
        const hasAllowedPrefix = allowedPrefixes.some(allowed =>
          importStatement.includes(`'${allowed}`) || importStatement.includes(`"${allowed}`)
        );

        expect(hasAllowedPrefix,
          `${file} has import ${importStatement} which doesn't match allowed prefixes: ${allowedPrefixes.join(', ')}`
        ).toBe(true);
      }
    }
  });
});
