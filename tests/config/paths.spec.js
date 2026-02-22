import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('config/paths', () => {
  const ROOT = process.cwd();

  beforeEach(() => {
    vi.resetModules();
  });

  describe('when SOURCE_DIR is not set', () => {
    it('should default to demo data path', async () => {
      delete process.env.SOURCE_DIR;
      const { paths } = await import('#config/paths');
      expect(paths.words).toBe(path.join(ROOT, 'data', 'demo', 'words'));
    });

    it('should default to demo images path', async () => {
      delete process.env.SOURCE_DIR;
      const { paths } = await import('#config/paths');
      expect(paths.images).toBe(path.join(ROOT, 'public', 'demo', 'images'));
    });
  });

  describe('when SOURCE_DIR is set to "demo"', () => {
    it('should use data/demo/words path', async () => {
      vi.stubEnv('SOURCE_DIR', 'demo');
      const { paths } = await import('#config/paths');
      expect(paths.words).toBe(path.join(ROOT, 'data', 'demo', 'words'));
    });

    it('should use public/demo/images path', async () => {
      vi.stubEnv('SOURCE_DIR', 'demo');
      const { paths } = await import('#config/paths');
      expect(paths.images).toBe(path.join(ROOT, 'public', 'demo', 'images'));
    });
  });

  describe('when SOURCE_DIR is set to "source"', () => {
    it('should use data/source/words path', async () => {
      vi.stubEnv('SOURCE_DIR', 'source');
      const { paths } = await import('#config/paths');
      expect(paths.words).toBe(path.join(ROOT, 'data', 'source', 'words'));
    });

    it('should use public/source/images path', async () => {
      vi.stubEnv('SOURCE_DIR', 'source');
      const { paths } = await import('#config/paths');
      expect(paths.images).toBe(path.join(ROOT, 'public', 'source', 'images'));
    });
  });

  describe('when SOURCE_DIR is set to custom value', () => {
    it('should use custom path for words', async () => {
      vi.stubEnv('SOURCE_DIR', 'custom');
      const { paths } = await import('#config/paths');
      expect(paths.words).toBe(path.join(ROOT, 'data', 'custom', 'words'));
    });

    it('should use custom path for images', async () => {
      vi.stubEnv('SOURCE_DIR', 'custom');
      const { paths } = await import('#config/paths');
      expect(paths.images).toBe(path.join(ROOT, 'public', 'custom', 'images'));
    });
  });

  describe('when SOURCE_DIR is empty string', () => {
    it('should default to demo data path', async () => {
      vi.stubEnv('SOURCE_DIR', '');
      const { paths } = await import('#config/paths');
      expect(paths.words).toBe(path.join(ROOT, 'data', 'demo', 'words'));
    });

    it('should default to demo images path', async () => {
      vi.stubEnv('SOURCE_DIR', '');
      const { paths } = await import('#config/paths');
      expect(paths.images).toBe(path.join(ROOT, 'public', 'demo', 'images'));
    });
  });

  describe('paths that do not depend on SOURCE_DIR', () => {
    it('should always use src/pages for pages path', async () => {
      const { paths } = await import('#config/paths');
      expect(paths.pages).toBe(path.join(ROOT, 'src', 'pages'));
    });

    it('should always use tools/fonts for fonts path', async () => {
      const { paths } = await import('#config/paths');
      expect(paths.fonts).toBe(path.join(ROOT, 'tools', 'fonts'));
    });
  });

  describe('createPaths function', () => {
    it('should return a new path configuration object', async () => {
      delete process.env.SOURCE_DIR;
      const { createPaths } = await import('#config/paths');
      const paths = createPaths();

      expect(paths).toHaveProperty('words');
      expect(paths).toHaveProperty('pages');
      expect(paths).toHaveProperty('images');
      expect(paths).toHaveProperty('fonts');
    });

    it('should return consistent paths when called multiple times', async () => {
      delete process.env.SOURCE_DIR;
      const { createPaths } = await import('#config/paths');
      const paths1 = createPaths();
      const paths2 = createPaths();

      expect(paths1.words).toBe(paths2.words);
      expect(paths1.images).toBe(paths2.images);
      expect(paths1.pages).toBe(paths2.pages);
      expect(paths1.fonts).toBe(paths2.fonts);
    });
  });
});
