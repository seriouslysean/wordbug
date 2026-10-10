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
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
      && ts.isStringLiteralLike(node.moduleReference.expression)) {
      specifiers.push(node.moduleReference.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
};

// A Vite `define` constant, by the naming astro.config.ts gives them all
const VITE_DEFINE = /^__[A-Z][A-Z_]*__$/;

/**
 * The Vite-only globals a file reads: `import.meta.env` and `define`
 * constants such as `__VERSION__`. Plain Node.js has neither.
 */
const getViteGlobalUses = (content: string): string[] => {
  const source = ts.createSourceFile('boundary-scan.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const uses: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && ts.isMetaProperty(node.expression)
      && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword && node.name.text === 'env') {
      uses.push('import.meta.env');
    }
    if (ts.isIdentifier(node) && VITE_DEFINE.test(node.text)) {
      uses.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return uses;
};

const parseSource = (content: string): ts.SourceFile =>
  ts.createSourceFile('boundary-scan.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

/**
 * The local name a module's named export is imported under (`pure` for
 * `import { name as pure }`), or undefined when the file does not import it.
 */
const getImportedLocalName = (source: ts.SourceFile, moduleName: string, importedName: string): string | undefined =>
  source.statements
    .filter(ts.isImportDeclaration)
    .filter(statement => ts.isStringLiteralLike(statement.moduleSpecifier) && statement.moduleSpecifier.text === moduleName)
    .flatMap(statement => {
      const bindings = statement.importClause?.namedBindings;
      return bindings && ts.isNamedImports(bindings) ? [...bindings.elements] : [];
    })
    .find(element => (element.propertyName ?? element.name).text === importedName)
    ?.name.text;

/**
 * The function a thin wrapper hands its work to: the callee of the one call
 * that is the whole body of the exported arrow function `exportName`, with
 * nothing but bare names for arguments. Undefined when there is no such
 * export, its body is anything else or an argument is an expression, so a
 * wrapper that filters, sorts or branches for itself, in its body or in what
 * it passes on, has no delegate.
 */
const getDelegate = (source: ts.SourceFile, exportName: string): string | undefined => {
  const wrapper = source.statements
    .filter(ts.isVariableStatement)
    .filter(statement => statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === exportName)
    ?.initializer;
  if (!wrapper || !ts.isArrowFunction(wrapper)) {
    return undefined;
  }

  const getReturned = (body: ts.ConciseBody): ts.Expression | undefined => {
    if (!ts.isBlock(body)) {
      return body;
    }
    const [only, ...rest] = body.statements;
    return only && rest.length === 0 && ts.isReturnStatement(only) ? only.expression : undefined;
  };

  // Every argument is a bare name, handed over as it is: an argument that is
  // itself an expression (words.filter(...)) is logic of the wrapper's own
  const returned = getReturned(wrapper.body);
  return returned && ts.isCallExpression(returned) && ts.isIdentifier(returned.expression)
    && returned.arguments.every(ts.isIdentifier)
    ? returned.expression.text
    : undefined;
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
      "import legacy = require('@sentry/astro');",
    ].join('\n');

    expect(getImportSpecifiers(source)).toEqual([
      '#utils/value',
      '#types',
      '#constants/setup',
      'astro:content',
      '@sentry/astro',
    ]);
  });

  it('Node.js-side code must not import by relative path', () => {
    // A relative specifier is no alias, so the checks on aliases never see
    // it: '../src/utils/logger' reaches Astro-only code from utils/
    for (const dir of NODE_SIDE_DIRS) {
      for (const filePath of getTypeScriptFiles(dir)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = path.relative(process.cwd(), filePath);
        const relative = getImportSpecifiers(content).filter(specifier => /^\.\.?(?:\/|$)/.test(specifier));

        expect({ [label]: relative }).toEqual({ [label]: [] });
      }
    }
  });

  it('Node.js-side code must not read Vite-only globals', () => {
    for (const dir of NODE_SIDE_DIRS) {
      // Declaration files only type the globals for src/
      for (const filePath of getTypeScriptFiles(dir).filter(file => !file.endsWith('.d.ts'))) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const label = path.relative(process.cwd(), filePath);

        expect({ [label]: getViteGlobalUses(content) }).toEqual({ [label]: [] });
      }
    }
  });

  it('finds every Vite-only global a file reads', () => {
    const source = [
      'const mode = import.meta.env.MODE;',
      'const version = __VERSION__;',
      'const here = import.meta.dirname;',
      '// __RELEASE__ and import.meta.env in a comment',
      'const dir = __dirname;',
    ].join('\n');

    expect(getViteGlobalUses(source)).toEqual(['import.meta.env', '__VERSION__']);
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
    const source = parseSource(fs.readFileSync(path.join(SRC_UTILS_DIR, 'word-data-utils.ts'), 'utf-8'));

    // Each wrapper is one call to the utils/ function of the same name. Any
    // logic of its own, however it is spelled, leaves it without a delegate.
    for (const fnName of ['getWordsByLength', 'getWordsByLetter', 'getWordsByPartOfSpeech', 'getAdjacentWords']) {
      const pure = getImportedLocalName(source, '#utils/word-data-utils', fnName);

      expect({ fnName, imported: pure !== undefined }).toEqual({ fnName, imported: true });
      expect({ fnName, delegatesTo: getDelegate(source, fnName) }).toEqual({ fnName, delegatesTo: pure });
    }
  });

  it('finds a delegate only for a wrapper that is one call', () => {
    const source = parseSource([
      "import { thin as thinPure, block as blockPure, plain } from '#utils/example';",
      "import { other } from '#utils/other';",
      'export const thin = (n: number, words = all) => thinPure(n, words);',
      'export const block = (n: number, words = all) => {',
      '  return blockPure(n, words);',
      '};',
      'export const copied = (n: number, words = all) => words.filter(w => w.word.length === n);',
      'export const extra = (n: number, words = all) => {',
      '  const kept = words.filter(Boolean);',
      '  return plain(n, kept);',
      '};',
      'const hidden = (n: number) => plain(n);',
      'export const prefiltered = (n: number, words = all) => plain(n, words.filter(w => w.word.length === n));',
    ].join('\n'));

    expect(getImportedLocalName(source, '#utils/example', 'thin')).toBe('thinPure');
    expect(getImportedLocalName(source, '#utils/example', 'plain')).toBe('plain');
    expect(getImportedLocalName(source, '#utils/example', 'other')).toBeUndefined();
    expect(['thin', 'block', 'copied', 'extra', 'hidden', 'missing', 'prefiltered'].map(name => getDelegate(source, name)))
      .toEqual(['thinPure', 'blockPure', undefined, undefined, undefined, undefined, undefined]);
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
