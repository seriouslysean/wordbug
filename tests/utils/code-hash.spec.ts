import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getCodeHash } from '#utils/code-hash';

const tempDirectories: string[] = [];

afterEach(() => {
  tempDirectories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }));
});

describe('getCodeHash', () => {
  it('changes when same-length file contents change', () => {
    const directory = mkdtempSync(join(tmpdir(), 'occasional-code-hash-'));
    tempDirectories.push(directory);
    const file = join(directory, 'source.ts');

    writeFileSync(file, 'aaaa');
    const first = getCodeHash([file]);
    writeFileSync(file, 'bbbb');

    expect(getCodeHash([file])).not.toBe(first);
  });

  it('includes file paths in the digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'occasional-code-hash-'));
    tempDirectories.push(directory);
    const firstFile = join(directory, 'first.ts');
    const secondFile = join(directory, 'second.ts');

    writeFileSync(firstFile, 'same');
    writeFileSync(secondFile, 'same');

    expect(getCodeHash([firstFile])).not.toBe(getCodeHash([secondFile]));
  });
});
