/**
 * Architecture tests to enforce the Node.js / Astro boundary
 *
 * These tests prevent boundary violations by ensuring:
 * 1. Node.js-side code (utils/, adapters/, tools/, constants/, config/, types/) never
 *    imports Astro-only modules (#astro-utils/*, astro:*, @sentry/astro)
 * 2. Delegated logic is imported from utils/, not duplicated in src/utils/
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

const UTILS_DIR = path.join(process.cwd(), 'utils');
const SRC_UTILS_DIR = path.join(process.cwd(), 'src', 'utils');
const NODE_SIDE_DIRS = ['utils', 'adapters', 'tools', 'constants', 'config', 'types'].map(
  dir => path.join(process.cwd(), dir),
);

const getTypeScriptFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => {
    if (entry.isDirectory()) {
      return getTypeScriptFiles(path.join(dir, entry.name));
    }
    return entry.name.endsWith('.ts') ? [path.join(dir, entry.name)] : [];
  });

const getImportSpecifiers = (content: string): string[] => {
  const source = ts.createSourceFile('boundary-scan.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
};

describe('Architecture: utils/ boundary enforcement', () => {
  it('Node.js-side code must not import Astro-only modules', () => {
    for (const dir of NODE_SIDE_DIRS) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      for (const filePath of getTypeScriptFiles(dir)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = path.relative(process.cwd(), filePath);
        const forbidden = getImportSpecifiers(content).filter(specifier =>
          specifier === '#astro-utils'
          || specifier.startsWith('#astro-utils/')
          || specifier.startsWith('astro:')
          || specifier === '@sentry/astro'
          || specifier.startsWith('@sentry/astro/'));

        expect({ [label]: forbidden }).toEqual({ [label]: [] });
      }
    }
  });

  it('extracts every literal module import form', () => {
    const source = [
      "import value from '#utils/value';",
      "export { value } from '#types';",
      "import '#constants/setup';",
      "const module = import('astro:content', { with: { type: 'json' } });",
      "// import('@sentry/astro')",
    ].join('\n');

    expect(getImportSpecifiers(source)).toEqual([
      '#utils/value',
      '#types',
      '#constants/setup',
      'astro:content',
    ]);
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
      expect({ fnName, matches: importPattern.test(content) }).toEqual({ fnName, matches: true });
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
        expect({ fnName, isDuplicated }).toEqual({ fnName, isDuplicated: false });
      }
    }
  });

  it('Node.js-side code can only import from allowed alias paths', () => {
    const allowedPrefixes = ['#utils', '#types', '#constants', '#config', '#locales', '#adapters', '#tools'];

    for (const dir of NODE_SIDE_DIRS) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      for (const filePath of getTypeScriptFiles(dir)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = path.relative(process.cwd(), filePath);
        const imports = getImportSpecifiers(content).filter(specifier => specifier.startsWith('#'));

        for (const specifier of imports) {
          const hasAllowedPrefix = allowedPrefixes.some(allowed =>
            specifier === allowed || specifier.startsWith(`${allowed}/`)
          );

          expect({ label, specifier, hasAllowedPrefix }).toEqual({ label, specifier, hasAllowedPrefix: true });
        }
      }
    }
  });
});
