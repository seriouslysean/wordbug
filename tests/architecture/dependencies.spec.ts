/**
 * Architecture test for the dependency tree.
 *
 * sharp ships a native libvips binary per copy. Astro resolves its own copy
 * when the top-level range does not satisfy it, which puts two libvips builds
 * in one install: the image tool renders with one and Astro with the other.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const lock = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf-8'));

describe('Architecture: dependencies', () => {
  it('installs exactly one copy of sharp', () => {
    const copies = Object.keys(lock.packages).filter(key => key.endsWith('node_modules/sharp'));

    expect(copies).toEqual(['node_modules/sharp']);
  });
});
