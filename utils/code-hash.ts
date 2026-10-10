import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const getCodeHash = (files: string[]): string => {
  const hash = createHash('sha256');

  files.toSorted().forEach(file => {
    try {
      hash.update(file);
      hash.update('\0');
      hash.update(readFileSync(file));
    } catch {
      // Skip files that don't exist (deleted but not yet committed).
    }
  });

  return hash.digest('hex').slice(0, 8);
};
