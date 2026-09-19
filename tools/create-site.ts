/**
 * Scaffolds a site repository that holds only its content and calls this
 * repository's Site Deploy and Site Add Word workflows at a pinned release.
 * It writes files and nothing else: no Git, no install, no network.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { isEntryPoint } from '#tools/entry';
import { showHelp } from '#tools/help-utils';
import { isValidDate } from '#utils/date-utils';
import { exit, getErrorMessage, logger } from '#utils/logger';
import { parseWordData } from '#utils/stored-word-validation';

const ENGINE_ROOT = path.join(import.meta.dirname, '..');
const TEMPLATES = path.join(import.meta.dirname, 'templates', 'site');

// A release tag or a full commit SHA: a branch or a major tag moves, and
// would change the engine a site runs without a change in the site
const ENGINE_REF = /^(v[0-9]+\.[0-9]+\.[0-9]+|[0-9a-f]{40})$/;

// The caller templates are the ones docs/technical.md shows, with this
// placeholder where the release goes
const REF_PLACEHOLDER = '@vX.Y.Z';

const HELP_TEXT = `
Create Site Tool

Writes a new site repository: its first word, a favicon, the Deploy and
Add Word workflows pinned to one engine release, Dependabot settings, a
README with the repository settings to make, .gitignore and .env.example.

Usage:
  node tools/create-site.ts <directory> --engine-ref <ref> --seed-file <file>
  npm run tool:create-site -- <directory> --engine-ref <ref> --seed-file <file>

Arguments:
  directory              The new site; must not exist or be empty

Options:
  --engine-ref <ref>     Engine release to pin: vX.Y.Z or a full commit SHA
  --seed-file <file>     A word file to publish first, as data/words holds them
  -h, --help             Show this help message

Examples:
  node tools/create-site.ts ../wordbee --engine-ref v3.23.0 --seed-file 20260918.json

Nothing is committed, installed or pushed.
`;

interface CreateSiteOptions {
  directory: string;
  engineRef: string;
  seedFile: string;
}

/**
 * Checks every input, then writes the site. Throws before writing anything
 * when an input is wrong.
 * @returns The site-relative paths written
 */
export const createSite = ({ directory, engineRef, seedFile }: CreateSiteOptions): string[] => {
  if (!ENGINE_REF.test(engineRef)) {
    throw new Error(`--engine-ref must be a release tag such as v1.2.3 or a full commit SHA, not ${engineRef}`);
  }

  const seed = fs.readFileSync(seedFile);
  const { date } = parseWordData(seed.toString('utf-8'), seedFile);
  if (!isValidDate(date)) {
    throw new Error(`Invalid word data in ${seedFile}: date must be YYYYMMDD, not ${date}`);
  }

  if (fs.existsSync(directory) && (!fs.statSync(directory).isDirectory() || fs.readdirSync(directory).length > 0)) {
    throw new Error(`${directory} must not exist or be an empty directory`);
  }

  const template = (name: string) => fs.readFileSync(path.join(TEMPLATES, name), 'utf-8');
  const pin = (name: string) => template(name).replaceAll(REF_PLACEHOLDER, `@${engineRef}`);
  const files: [string, string | Buffer][] = [
    ['.github/workflows/deploy.yml', pin('deploy.yml')],
    ['.github/workflows/add-word.yml', pin('add-word.yml')],
    ['.github/dependabot.yml', template('dependabot.yml')],
    ['README.md', template('README.md')],
    ['.gitignore', template('gitignore')],
    ['.env.example', fs.readFileSync(path.join(ENGINE_ROOT, '.env.example'))],
    [`data/words/${date.slice(0, 4)}/${date}.json`, seed],
    ['public/favicon.svg', fs.readFileSync(path.join(ENGINE_ROOT, 'public', 'favicon.svg'))],
  ];

  for (const [file, content] of files) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { flag: 'wx' });
  }
  return files.map(([file]) => file);
};

if (isEntryPoint(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        help: { type: 'boolean', short: 'h', default: false },
        'engine-ref': { type: 'string' },
        'seed-file': { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    });

    if (values.help) {
      showHelp(HELP_TEXT);
      process.exit(0);
    }

    const [directory] = positionals;
    const engineRef = values['engine-ref'];
    const seedFile = values['seed-file'];
    if (positionals.length !== 1 || !directory || !engineRef || !seedFile) {
      throw new Error('Pass one directory, --engine-ref and --seed-file (see --help)');
    }

    const files = createSite({ directory, engineRef, seedFile });
    logger.info('Site created', { directory: path.resolve(directory), engineRef, files });
  } catch (error) {
    logger.error('Create site failed', { error: getErrorMessage(error) });
    await exit(1);
  }
}
