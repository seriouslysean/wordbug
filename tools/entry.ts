import { fileURLToPath } from 'node:url';

export const isEntryPoint = (importMetaUrl: string): boolean =>
  process.argv[1] === fileURLToPath(importMetaUrl);
