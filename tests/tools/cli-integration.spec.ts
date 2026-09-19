/**
 * CLI Tool Integration Tests
 *
 * These tests verify that CLI tools can be loaded and executed without errors.
 * Specifically designed to catch regressions like the astro: protocol issue
 * that broke tools after the code readability merge.
 *
 * Tests run against the actual tool files to ensure:
 * 1. No import errors (astro:, #astro-utils dependencies)
 * 2. Tools can be executed with minimal inputs
 * 3. Basic functionality works end-to-end
 *
 * Static analysis of import boundaries is handled by tests/architecture/utils-boundary.spec.ts.
 *
 * Implementation notes:
 * - Import tests mock process.exit to prevent tools from terminating test runner
 * - Spawn tests await the child process so assertion failures are observed
 * - tests/setup.ts mocks astro:content and astro:env/client for every spec, so
 *   the in-process import tests cannot see an illegal import of those two
 *   modules. The spawn tests run outside Vitest and are the guard for them.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnTool } from '#tests/helpers/spawn.ts';
import { isRecord, isString } from '#utils/type-guards';

const TOOLS_DIR = path.join(process.cwd(), 'tools');
const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'demo', 'words');
const DEMO_ENV = { SOURCE_DIR: 'demo' };

describe('CLI Tools: Import & Execution', () => {

  it('tools can be imported without astro: protocol errors', async () => {
    // Mock process.exit to prevent tools from exiting during import
    // Tools have top-level code that may call process.exit()
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Tool unexpectedly called process.exit(${String(code)}) during import`);
    });

    // This test would have caught the regression immediately
    const toolFiles = [
      'add-word.ts',
      'create-site.ts',
      'generate-images.ts',
      'utils.ts',
    ];

    try {
      // Import all tools in parallel for faster execution
      const importPromises = toolFiles.map(async (toolFile) => {
        const toolPath = path.join(TOOLS_DIR, toolFile);

        try {
          await import(toolPath);
        } catch (error) {
          // Check for the specific error that broke tools
          if (error instanceof Error && error.message.includes('astro:')) {
            throw new Error(
              `${toolFile} has astro: protocol dependency: ${error.message}\n` +
              `This breaks CLI tools. Check for imports from #astro-utils/* in utils/ files.`, { cause: error }
            );
          }

          // Argument parsing, help and main() all sit behind isEntryPoint, so an
          // import runs no CLI code whatever the runner's argv holds. Any other
          // throw is a real break.
          throw error;
        }
      });

      // Wait for all imports to complete
      await Promise.all(importPromises);
    } finally {
      // Restore original process.exit
      mockExit.mockRestore();
    }
  }, 15000);

  it('importing generate-images never parses the host process argv', async () => {
    const originalArgv = process.argv;
    // A flag the tool does not define: strict parseArgs would throw on it.
    process.argv = [...originalArgv.slice(0, 2), '--not-a-generate-images-flag'];
    vi.resetModules();

    try {
      await expect(import(path.join(TOOLS_DIR, 'generate-images.ts'))).resolves.toBeDefined();
    } finally {
      process.argv = originalArgv;
    }
  }, 15000);

  it('generate-images tool can load and show help', async () => {
    const { stdout, stderr, code } = await spawnTool(['tools/generate-images.ts', '--help'], { env: DEMO_ENV });

    expect(code).toBe(0);
    expect(stdout).toContain('Generate Images Tool');
    expect(stdout).toContain('Usage:');
    expect(stderr).not.toContain('astro:');
  }, 15000);

  it('add-word tool can load and show help', async () => {
    const { stdout, stderr, code } = await spawnTool(['tools/add-word.ts', '--help'], { env: DEMO_ENV });

    expect(code).toBe(0);
    expect(stdout).toContain('Add Word Tool');
    expect(stdout).toContain('Usage:');
    expect(stderr).not.toContain('astro:');
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
      const { words } = utils.getAllWords();
      expect(Array.isArray(words)).toBe(true);

    } catch (error) {
      if (error instanceof Error && error.message.includes('astro:')) {
        throw new Error(
          'tools/utils.ts has astro: dependency - this broke CLI tools.\n' +
          'Check for imports from utils/page-metadata-utils or other files that import #astro-utils', { cause: error }
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

      try {
        await import(fullPath);
      } catch (error) {
        if (error instanceof Error && error.message.includes('astro:')) {
          throw new Error(
            `${utilPath} has astro: dependency which breaks CLI tools.\n` +
            `Error: ${error.message}\n` +
            `utils/ files must not import from #astro-utils/* or astro: modules.`, { cause: error }
          );
        }

        // A missing util or unresolvable import is a real import-chain break
        throw error;
      }
    }
  });
});

describe('CLI Tools: Basic Functionality', () => {

  it('generate-images can process a word from demo data', async () => {
    // Find an actual word from demo data to test with. The demo dataset is
    // always present, so a missing fixture is a failure rather than a skip.
    const yearDirs = fs.readdirSync(TEST_DATA_DIR).filter(d => /^\d{4}$/.test(d));
    expect(yearDirs.length).toBeGreaterThan(0);
    const firstYear = yearDirs[0];
    if (!firstYear) {
      throw new Error('Demo data has no year directory');
    }

    const firstYearDir = path.join(TEST_DATA_DIR, firstYear);
    const wordFiles = fs.readdirSync(firstYearDir).filter(f => f.endsWith('.json'));
    expect(wordFiles.length).toBeGreaterThan(0);
    const firstFile = wordFiles[0];
    if (!firstFile) {
      throw new Error('Demo year has no word file');
    }

    const firstWordFile = path.join(firstYearDir, firstFile);
    const wordData: unknown = JSON.parse(fs.readFileSync(firstWordFile, 'utf-8'));
    if (!isRecord(wordData) || !isString(wordData.word)) {
      throw new Error(`Demo fixture has no word: ${firstWordFile}`);
    }
    const testWord = wordData.word;

    // Redirect output to a throwaway temp dir so generation never overwrites
    // the tracked demo social cards under public/.
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotd-images-'));

    try {
      const { stdout, stderr, code } = await spawnTool(
        ['tools/generate-images.ts', '--word', testWord, '--force'],
        { env: { ...DEMO_ENV, IMAGES_OUTPUT_DIR: outputDir }, timeout: 30000 },
      );

      expect(code).toBe(0);
      expect(stdout).toContain('Generate images tool starting');
      expect(stdout).toContain(`Generated image for word`);
      expect(stderr).not.toContain('astro:');
      expect(stderr).not.toContain('Only URLs with a scheme in: file, data, and node');
      // The card landed in the temp dir, not the tracked public/ tree.
      const generated = fs.readdirSync(outputDir, { recursive: true })
        .filter(entry => String(entry).endsWith('.png'));
      expect(generated.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
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
      if (error instanceof Error && error.message.includes('astro:')) {
        throw new Error(
          'constants/urls.ts has astro: dependency.\n' +
          'This was fixed by moving slugify to utils/text-utils.ts.\n' +
          'Check if the fix was reverted or a new astro dependency was added.', { cause: error }
        );
      }
      throw error;
    }
  });
});
