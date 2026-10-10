import { describe, expect, it } from 'vitest';

import {
  getImagesDir,
  getSocialCardPath,
  getSocialImagePath,
  toUrlPath,
} from '#utils/image-path-utils';

describe('image-path-utils', () => {
  describe('getImagesDir', () => {
    it('puts SOURCE_DIR before the images directory', () => {
      expect(getImagesDir('demo')).toBe('demo/images');
    });

    it('uses the root images directory when SOURCE_DIR is empty or missing', () => {
      expect(getImagesDir('')).toBe('images');
      expect(getImagesDir()).toBe('images');
    });
  });

  describe('getSocialCardPath', () => {
    it('files a word card under its year, named by date and word', () => {
      expect(getSocialCardPath({ type: 'word', word: 'giggle', date: '20240105' }))
        .toBe('social/2024/20240105-giggle.png');
    });

    it('lowercases the word', () => {
      expect(getSocialCardPath({ type: 'word', word: 'Amblypygi', date: '20250310' }))
        .toBe('social/2025/20250310-amblypygi.png');
    });

    it('keeps spaces and punctuation in the word as written', () => {
      expect(getSocialCardPath({ type: 'word', word: 'ice cream', date: '20240615' }))
        .toBe('social/2024/20240615-ice cream.png');
      expect(getSocialCardPath({ type: 'word', word: 'pb&j', date: '20230102' }))
        .toBe('social/2023/20230102-pb&j.png');
      expect(getSocialCardPath({ type: 'word', word: "Don't", date: '20230103' }))
        .toBe("social/2023/20230103-don't.png");
    });

    it('flattens a nested page path into one slug', () => {
      expect(getSocialCardPath({ type: 'page', path: '/browse/2023/april' }))
        .toBe('social/pages/browse-2023-april.png');
    });

    it('names a top-level page after its only segment', () => {
      expect(getSocialCardPath({ type: 'page', path: '/stats' })).toBe('social/pages/stats.png');
      expect(getSocialCardPath({ type: 'page', path: '/404' })).toBe('social/pages/404.png');
    });

    it('ignores a missing leading slash and a trailing slash', () => {
      expect(getSocialCardPath({ type: 'page', path: 'browse/letter/a/' }))
        .toBe('social/pages/browse-letter-a.png');
    });
  });

  describe('getSocialImagePath', () => {
    it('joins the images directory and the card path', () => {
      expect(getSocialImagePath({ type: 'word', word: 'giggle', date: '20240105' }, 'demo'))
        .toBe('demo/images/social/2024/20240105-giggle.png');
      expect(getSocialImagePath({ type: 'page', path: '/stats' }))
        .toBe('images/social/pages/stats.png');
    });
  });

  describe('toUrlPath', () => {
    it('roots the path and leaves plain segments alone', () => {
      expect(toUrlPath('demo/images/social/pages/stats.png')).toBe('/demo/images/social/pages/stats.png');
    });

    it('percent-encodes what a path segment cannot carry, but not the separators', () => {
      expect(toUrlPath('images/social/2024/20240615-ice cream.png'))
        .toBe('/images/social/2024/20240615-ice%20cream.png');
      expect(toUrlPath('images/social/2023/20230103-what?#.png'))
        .toBe('/images/social/2023/20230103-what%3F%23.png');
    });

    it('keeps characters that are legal in a path segment literal', () => {
      expect(toUrlPath('images/social/2023/20230102-pb&j.png'))
        .toBe('/images/social/2023/20230102-pb&j.png');
      expect(toUrlPath("images/social/2023/20230103-don't.png"))
        .toBe("/images/social/2023/20230103-don't.png");
    });

    it('resolves to the file under decodeURI, which static preview servers use', () => {
      const publicPath = 'images/social/2023/20230102-pb&j and 100%.png';

      expect(decodeURI(toUrlPath(publicPath))).toBe(`/${publicPath}`);
    });

    it('decodes back to the file it names', () => {
      const publicPath = "images/social/2023/20230104-rock & roll's 100%.png";

      expect(decodeURIComponent(toUrlPath(publicPath))).toBe(`/${publicPath}`);
    });
  });
});
