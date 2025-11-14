/**
 * CLI Tool Integration Tests
 *
 * These tests verify that CLI tools can be loaded and executed without errors.
 * Specifically designed to catch regressions like the astro: protocol issue
 * that broke tools after the code readability merge.
 *
 * Tests run against the actual tool files to ensure:
 * 1. No import errors (astro:, ~astro-utils dependencies)
 * 2. Tools can be executed with minimal inputs
 * 3. Basic functionality works end-to-end
 *
 * NOTE: You may see "Unhandled Rejection: process.exit" warnings in test output.
 * This is expected because some tool files have top-level code that calls process.exit().
 * These warnings don't affect test results - the tests still pass/fail correctly.
 * The important thing is that astro: protocol errors are caught before process.exit.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TOOLS_DIR = path.join(process.cwd(), 'tools');
const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'demo', 'words');

describe('CLI Tools: Import & Execution', () => {

  it('tools can be imported without astro: protocol errors', async () => {
    // This test would have caught the regression immediately
    const toolFiles = [
      'add-word.ts',
      'generate-images.ts',
      'utils.ts',
    ];

    for (const toolFile of toolFiles) {
      const toolPath = path.join(TOOLS_DIR, toolFile);

      // Try to load the module - will fail with astro: protocol error if broken
      try {
        // Use dynamic import to actually load the module
        await import(toolPath);
      } catch (error) {
        // Check for the specific error that broke tools
        if (error.message.includes("astro:")) {
          throw new Error(
            `${toolFile} has astro: protocol dependency: ${error.message}\n` +
            `This breaks CLI tools. Check for imports from ~astro-utils/* in utils/ files.`
          );
        }

        // Allow other expected errors (e.g., missing env vars at import time)
        // but not import resolution errors
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
          throw error;
        }
      }
    }
  });

  it('generate-images tool can load and show help', (done) => {
    const proc = spawn('npx', ['tsx', 'tools/generate-images.ts', '--help'], {
      env: { ...process.env, SOURCE_DIR: 'demo' },
      timeout: 10000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());

    proc.on('close', (code) => {
      // Help should exit with 0 and show usage
      expect(code).toBe(0);
      expect(stdout).toContain('Generate Images Tool');
      expect(stdout).toContain('Usage:');
      expect(stderr).not.toContain('astro:');
      done();
    });
  }, 15000);

  it('add-word tool can load and show help', (done) => {
    const proc = spawn('npx', ['tsx', 'tools/add-word.ts', '--help'], {
      env: { ...process.env, SOURCE_DIR: 'demo' },
      timeout: 10000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());

    proc.on('close', (code) => {
      expect(code).toBe(0);
      expect(stdout).toContain('Add Word Tool');
      expect(stdout).toContain('Usage:');
      expect(stderr).not.toContain('astro:');
      done();
    });
  }, 15000);

  it('utils can load getAllWords without astro dependencies', async () => {
    // This specifically tests the function that broke in the regression
    const utilsPath = path.join(TOOLS_DIR, 'utils.ts');

    try {
      const utils = await import(utilsPath);

      // Verify getAllWords is exported (used by generate-images)
      expect(utils.getAllWords).toBeDefined();
      expect(typeof utils.getAllWords).toBe('function');

      // Should be able to call it (even if it returns empty array in test env)
      const words = utils.getAllWords();
      expect(Array.isArray(words)).toBe(true);

    } catch (error) {
      if (error.message.includes('astro:')) {
        throw new Error(
          'tools/utils.ts has astro: dependency - this broke CLI tools.\n' +
          'Check for imports from utils/page-metadata-utils or other files that import ~astro-utils'
        );
      }
      throw error;
    }
  });

  it('shared utils used by tools have no astro dependencies', async () => {
    // Test the utils that tools commonly import
    const sharedUtils = [
      'utils/word-data-utils.ts',
      'utils/text-utils.ts',
      'utils/date-utils.ts',
      'utils/url-utils.ts',
      'utils/page-metadata-utils.ts',
    ];

    for (const utilPath of sharedUtils) {
      const fullPath = path.join(process.cwd(), utilPath);

      if (!fs.existsSync(fullPath)) continue;

      try {
        await import(fullPath);
      } catch (error) {
        if (error.message.includes('astro:')) {
          throw new Error(
            `${utilPath} has astro: dependency which breaks CLI tools.\n` +
            `Error: ${error.message}\n` +
            `utils/ files must not import from ~astro-utils/* or astro: modules.`
          );
        }

        // Allow other errors (missing types, etc.) but not astro: imports
        if (error.code !== 'ERR_MODULE_NOT_FOUND') {
          throw error;
        }
      }
    }
  });
});

describe('CLI Tools: Basic Functionality', () => {

  it('generate-images can process a word from demo data', (done) => {
    // Find an actual word from demo data to test with
    if (!fs.existsSync(TEST_DATA_DIR)) {
      console.log('Skipping: demo data not available');
      done();
      return;
    }

    const yearDirs = fs.readdirSync(TEST_DATA_DIR).filter(d => /^\d{4}$/.test(d));
    if (yearDirs.length === 0) {
      console.log('Skipping: no year directories in demo data');
      done();
      return;
    }

    const firstYearDir = path.join(TEST_DATA_DIR, yearDirs[0]);
    const wordFiles = fs.readdirSync(firstYearDir).filter(f => f.endsWith('.json'));

    if (wordFiles.length === 0) {
      console.log('Skipping: no word files in demo data');
      done();
      return;
    }

    const firstWordFile = path.join(firstYearDir, wordFiles[0]);
    const wordData = JSON.parse(fs.readFileSync(firstWordFile, 'utf-8'));
    const testWord = wordData.word;

    const proc = spawn('npx', ['tsx', 'tools/generate-images.ts', '--word', testWord], {
      env: { ...process.env, SOURCE_DIR: 'demo' },
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data.toString());
    proc.stderr.on('data', (data) => stderr += data.toString());

    proc.on('close', (code) => {
      // Should succeed
      expect(code).toBe(0);
      expect(stdout).toContain('Generate images tool starting');
      expect(stdout).toContain(`Generated image for word`);

      // Should not have astro: errors
      expect(stderr).not.toContain('astro:');
      expect(stderr).not.toContain('Only URLs with a scheme in: file, data, and node');

      done();
    });
  }, 35000);

  it('tools can access constants without circular dependencies', async () => {
    // Verify the constants/urls.ts fix worked
    const constantsPath = path.join(process.cwd(), 'constants', 'urls.ts');

    try {
      const urls = await import(constantsPath);

      // Should have main exports
      expect(urls.BASE_PATHS).toBeDefined();
      expect(urls.ROUTES).toBeDefined();

      // ROUTES should have functions that work
      expect(typeof urls.ROUTES.WORD).toBe('function');
      expect(urls.ROUTES.WORD('test')).toBe('/word/test');

    } catch (error) {
      if (error.message.includes('astro:')) {
        throw new Error(
          'constants/urls.ts has astro: dependency.\n' +
          'This was fixed by moving slugify to utils/text-utils.ts.\n' +
          'Check if the fix was reverted or a new astro dependency was added.'
        );
      }
      throw error;
    }
  });
});

describe('CLI Tools: Regression Detection', () => {

  it('detects if utils/page-metadata-utils imports from astro layer', async () => {
    const filePath = path.join(process.cwd(), 'utils', 'page-metadata-utils.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for the exact regression that happened
    const astroImports = content.match(/from ['"]~astro-utils\//g);

    expect(astroImports,
      'utils/page-metadata-utils.ts imports from ~astro-utils/* which breaks CLI tools. ' +
      'This is the exact regression that broke word adding. ' +
      'Import from ~utils/* instead and add functions to utils/word-data-utils.ts'
    ).toBeNull();
  });

  it('detects if constants/urls imports from astro layer', async () => {
    const filePath = path.join(process.cwd(), 'constants', 'urls.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const astroImports = content.match(/from ['"]~astro-utils\//g);

    expect(astroImports,
      'constants/urls.ts imports from ~astro-utils/* which breaks CLI tools. ' +
      'slugify should be imported from ~utils/text-utils, not ~astro-utils/url-utils'
    ).toBeNull();
  });

  it('tools/utils.ts does not import problematic files', async () => {
    const filePath = path.join(TOOLS_DIR, 'utils.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if it imports files that might have astro dependencies
    const problematicImports = content.match(/from ['"]~utils\/page-metadata-utils['"]/g);

    // This is OK now that we fixed page-metadata-utils, but keeping as guard
    // If page-metadata-utils gets astro imports again, this will catch it
    if (problematicImports) {
      // Try to import it to verify it's safe
      try {
        await import(filePath);
      } catch (error) {
        if (error.message.includes('astro:')) {
          throw new Error(
            'tools/utils.ts imports utils/page-metadata-utils which has astro: dependencies. ' +
            'This breaks CLI tools.'
          );
        }
      }
    }
  });
});
