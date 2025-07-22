import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

/**
 * Command-line script to generate a code hash based on src/ directory contents
 * This ensures repos with same code but different words/images have the same hash
 * Usage: npm run tool:generate-code-hash
 */

export function getCodeHash(): string {
  const hash = createHash('sha256');
  
  const srcFiles = execSync('git ls-files src/', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.length > 0)
    .sort();
  
  srcFiles.forEach(file => {
    const { size } = statSync(file);
    hash.update(`${file}:${size}`);
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