import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('config/paths', () => {
  const ROOT = process.cwd();

  beforeEach(() => {
    vi.resetModules();
  });

  it.each([
    ['unset', undefined, ['data', 'words'], ['public', 'images']],
    ['empty', '', ['data', 'words'], ['public', 'images']],
    ['demo', 'demo', ['data', 'demo', 'words'], ['public', 'demo', 'images']],
    ['source', 'source', ['data', 'source', 'words'], ['public', 'source', 'images']],
    ['custom', 'custom', ['data', 'custom', 'words'], ['public', 'custom', 'images']],
  ])('puts words and images where SOURCE_DIR is %s says, and pages and fonts in the project', async (_label, sourceDir, words, images) => {
    vi.stubEnv('SOURCE_DIR', sourceDir);
    const { paths } = await import('#config/paths');

    expect(paths).toEqual({
      words: path.join(ROOT, ...words),
      images: path.join(ROOT, ...images),
      pages: path.join(ROOT, 'src', 'pages'),
      fonts: path.join(ROOT, 'tools', 'fonts'),
    });
  });

  it('createPaths reads SOURCE_DIR at call time', async () => {
    vi.stubEnv('SOURCE_DIR', 'first');
    const { createPaths } = await import('#config/paths');
    const paths1 = createPaths();

    vi.stubEnv('SOURCE_DIR', 'second');
    const paths2 = createPaths();

    expect(paths1.words).toContain('first');
    expect(paths2.words).toContain('second');
  });
});
