/**
 * Architecture test for how environment variables reach CI.
 *
 * astro.config.ts declares what the site reads, but a workflow only sees the
 * repository variables that .github/actions/setup-env copies into the job by
 * name. A variable declared in the schema and absent from those lists builds
 * fine locally and is silently its default in production: the COLOR_DARK_*
 * set was missing, so no deployed site could turn dark mode on.
 *
 * The action reads VAR_NAMES from repository variables and SECRET_NAMES from
 * secrets, never both. A name in the wrong list is read from the store the
 * owner did not fill, exported empty, and falls back to its default just as
 * silently: SITE_LOCALE in SECRET_NAMES builds <html lang="en-US"> whatever
 * the repository variable says.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  createSourceFile,
  forEachChild,
  isAsExpression,
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isStringLiteral,
  isVariableDeclaration,
  ScriptKind,
  ScriptTarget,
  type Node,
  type PropertyName,
} from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(ROOT, file), 'utf-8');

const SET_BY_ACTION = /^\s+put_env ([A-Z][A-Z0-9_]*) /gm;

const captures = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].flatMap(match => match[1] === undefined ? [] : [match[1]]);

// The lines of a `KEY: |` block scalar, which run until a line indented no
// deeper than the key. Only the indent (and a CRLF carriage return) is
// removed: a commented-out name must not pass for a listed one, and a
// trailing space must survive, because the action would export it as part of
// the variable's name.
const blockLines = (text: string, key: string): string[] => {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === `${key}: |`);
  if (start < 0) {
    return [];
  }
  const indent = lines[start]?.search(/\S/) ?? -1;
  const end = lines.findIndex((line, index) => index > start && line.trim() !== '' && line.search(/\S/) <= indent);
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .map(line => line.replace(/\r$/, '').trimStart())
    .filter(Boolean);
};

const propertyName = (name: PropertyName): string | undefined => {
  if (isIdentifier(name) || isStringLiteral(name)) {
    return name.text;
  }
  return undefined;
};

const objectLiteralInitializer = (node: Node) => {
  if (!isVariableDeclaration(node) || node.initializer === undefined) {
    return undefined;
  }
  const initializer = isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
  return isObjectLiteralExpression(initializer) ? initializer : undefined;
};

// Read direct envField properties and the keys in colorFields, which are
// spread into the schema and therefore do not appear as property assignments
// in the schema object itself.
const declaredNames = (text: string): string[] => {
  const source = createSourceFile('astro.config.ts', text, ScriptTarget.Latest, true, ScriptKind.TS);
  const names = new Set<string>();

  const visit = (node: Node): void => {
    const initializer = objectLiteralInitializer(node);
    if (
      isVariableDeclaration(node)
      && isIdentifier(node.name)
      && node.name.text === 'colorFields'
      && initializer !== undefined
    ) {
      initializer.properties.forEach(property => {
        if (isPropertyAssignment(property)) {
          const name = propertyName(property.name);
          if (name !== undefined) {
            names.add(name);
          }
        }
      });
    }

    if (isPropertyAssignment(node) && isCallExpression(node.initializer)) {
      const expression = node.initializer.expression;
      if (
        isPropertyAccessExpression(expression)
        && isIdentifier(expression.expression)
        && expression.expression.text === 'envField'
      ) {
        const name = propertyName(node.name);
        if (name !== undefined) {
          names.add(name);
        }
      }
    }

    forEachChild(node, visit);
  };

  visit(source);
  return [...names];
};

// Where docs/technical.md tells site owners to store each setting: API keys,
// GA_* and SENTRY_* are secrets and everything else is a variable.
// SENTRY_ENVIRONMENT is the exception because the action sets it itself.
// The lists have to follow the same rule, or the action reads a store the
// owner never filled.
const isSecret = (name: string): boolean =>
  name.endsWith('_API_KEY') || name.startsWith('GA_') || (name.startsWith('SENTRY_') && name !== 'SENTRY_ENVIRONMENT');

describe('Architecture: environment transport', () => {
  const action = read('.github/actions/setup-env/action.yml');
  const variables = blockLines(action, 'VAR_NAMES');
  const secrets = blockLines(action, 'SECRET_NAMES');

  it('exports every variable in the Astro env schema from setup-env', () => {
    const declared = declaredNames(read('astro.config.ts'));
    const exported = new Set([...variables, ...secrets, ...captures(action, SET_BY_ACTION)]);

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter(name => !exported.has(name))).toEqual([]);
  });

  it('lists only bare variable names', () => {
    const malformed = [...variables, ...secrets].filter(name => !/^[A-Z][A-Z0-9_]*$/.test(name));

    expect(malformed).toEqual([]);
  });

  it('reads secrets from SECRET_NAMES and everything else from VAR_NAMES', () => {
    expect(variables.length).toBeGreaterThan(0);
    expect(secrets.length).toBeGreaterThan(0);
    expect(variables.filter(isSecret)).toEqual([]);
    expect(secrets.filter(name => !isSecret(name))).toEqual([]);
  });
});
