import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Command-line script to generate a code hash based on src/ directory contents
 * This ensures repos with same code but different words/images have the same hash
 * Usage: npm run tool:generate-code-hash
 */

function getCodeHash(): string {
  const hash = createHash('sha256');
  
  const srcFiles = readdirSync('src', { recursive: true, withFileTypes: true })
    .filter(file => file.isFile())
    .map(file => join(file.parentPath || file.path, file.name))
    .sort();
  
  srcFiles.forEach(file => {
    const { size, mtimeMs } = statSync(file);
    hash.update(`${file}:${size}:${mtimeMs}`);
  });
  
  return hash.digest('hex').substring(0, 8);
}

try {
  const codeHash = getCodeHash();
  console.log(codeHash);
} catch (error) {
  console.error('Error generating code hash:', error.message);
  process.exit(1);
}