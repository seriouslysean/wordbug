import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { WordData } from '~types/word';
import { formatDate } from '~utils/date-utils';
import { getAllPageMetadata } from '~utils-client/page-metadata';
import { generateWordDataHash } from '~utils-client/word-data-utils';

/**
 * List of supported static text files
 */
export const STATIC_FILES = [
  'robots.txt',
  'humans.txt',
  'health.txt',
  'llms.txt',
];

/**
 * Reads ASCII art from public directory
 * Tries site-specific file first, then fallback to default
 * @returns ASCII art string or null if not found
 */
export function getAsciiArt(): string | null {
  const siteId = __SITE_ID__;
  const publicDir = join(process.cwd(), 'public');

  // Try site-specific file first, then default
  const filesToTry = [
    siteId ? `ascii-${siteId}.txt` : null,
    'ascii.txt',
  ].filter(Boolean) as string[];

  for (const filename of filesToTry) {
    try {
      const filePath = join(publicDir, filename);
      return readFileSync(filePath, 'utf-8').trimEnd();
    } catch {
      // File doesn't exist, try next one
      continue;
    }
  }

  return null;
}

/**
 * Generates robots.txt content
 *
 * @param siteUrl - The base URL of the site
 * @returns The content for robots.txt
 */
export function generateRobotsTxt(siteUrl: string): string {
  // Use injected __SITE_URL__ if available, else fallback to param, else fallback to localhost
  const envUrl = typeof __SITE_URL__ !== 'undefined' ? __SITE_URL__ : '';
  const url = envUrl || siteUrl;
  const baseUrl = !url ? 'http://localhost:4321' : url.endsWith('/') ? url.slice(0, -1) : url;
  return `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap-index.xml
`;
}

/**
 * Generates humans.txt content with static values
 *
 * @returns The content for humans.txt
 */
export function generateHumansTxt(): string {
  // Define static sections
  const teamSection = [
    '/* TEAM */',
    // These will be replaced with actual values at build time via Vite's define
    // If they're empty, they won't be included
    __HUMANS_WORD_CURATOR__ && `Word Curator: ${__HUMANS_WORD_CURATOR__}`,
    __HUMANS_DEVELOPER_NAME__ && `Developer: ${__HUMANS_DEVELOPER_NAME__}`,
    __HUMANS_DEVELOPER_CONTACT__ && `Contact: ${__HUMANS_DEVELOPER_CONTACT__}`,
    __HUMANS_DEVELOPER_SITE__ && `Site: ${__HUMANS_DEVELOPER_SITE__}`,
    '',
  ].filter(Boolean).join('\n');

  const thanksSection = [
    '/* THANKS */',
    'Wordnik',
    'Dictionary contributors worldwide',
    '',
  ].join('\n');

  const siteSection = [
    '/* SITE */',
    'Standards: HTML5, CSS3',
  ].join('\n');

  // Combine all sections
  return [
    teamSection,
    thanksSection,
    siteSection,
  ].join('\n');
}

/**
 * Generates health.txt content
 *
 * @param {WordData[]} [words=allWords] - Array of word data to use for stats
 * @returns The content for health.txt
 */
export function generateHealthTxt(words: WordData[]): string {
  // Get the current time for timestamp
  const currentTime = new Date().toISOString();
  // Use Vite's injected constants, which will be replaced at build time
  const version = __VERSION__;
  const release = __RELEASE__;
  const buildTime = __TIMESTAMP__;
  // Get all words and hash
  const wordCount = words.length;
  const wordHash = generateWordDataHash(words.map(w => w.word));
  // Format as simple text with one value per line
  return [
    'status: ok',
    `timestamp: ${currentTime}`,
    `version: ${version}`,
    `release: ${release}`,
    `build_time: ${buildTime}`,
    `words_count: ${wordCount}`,
    `words_hash: ${wordHash}`,
  ].join('\n');
}

/**
 * Generates llms.txt content with recent words and key site links
 *
 * @param {WordData[]} [words=allWords] - Array of word data to use for stats
 * @returns The content for llms.txt or null if required data is missing
 */
export function generateLlmsTxt(words: WordData[]): string | null {
  const siteTitle = __SITE_TITLE__;
  const siteDescription = __SITE_DESCRIPTION__;
  const siteUrl = __SITE_URL__;

  if (!siteTitle || !siteDescription || !siteUrl) {
    return null;
  }

  const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const recentWords = words.slice(-5);

  const curatorInfo = __HUMANS_WORD_CURATOR__ ? ` Curated by ${__HUMANS_WORD_CURATOR__}.` : '';
  const lastUpdated = words.length > 0 ? formatDate(words[words.length - 1].date) : null;

  let recentWordSection = '';
  if (recentWords.length > 0) {
    const [todayWord, ...previousWords] = [...recentWords].reverse();
    recentWordSection = [
      `- [${todayWord.word}](${baseUrl}/${todayWord.word}): ${formatDate(todayWord.date)}`,
      ...previousWords.map(word => `- [${word.word}](${baseUrl}/${word.word}): ${formatDate(word.date)}`),
    ].join('\n');
  }

  const allPages = getAllPageMetadata(words);
  const allWordsPage = allPages.find(p => p.path === 'words');
  const yearPages = allPages.filter(p => /^words\/[0-9]{4}$/.test(p.path)).sort((a, b) => b.path.localeCompare(a.path));
  const staticPages = allPages.filter(p =>
    !['', 'words', 'stats'].includes(p.path) &&
    !/^words\/[0-9]{4}$/.test(p.path) &&
    !p.path.startsWith('stats/'),
  );
  const statsPage = allPages.find(p => p.path === 'stats');
  const statsSubpages = allPages.filter(p => p.path.startsWith('stats/') && p.path !== 'stats')
    .sort((a, b) => a.title.localeCompare(b.title));

  // Build Pages section
  const pagesLinks = [
    allWordsPage && `- [${allWordsPage.title}](${baseUrl}/words): ${allWordsPage.description}`,
    yearPages.length > 0 && [
      '### Year Archives',
      ...yearPages.map(page => `- [${page.title}](${baseUrl}/${page.path}): ${page.description}`),
    ],
    staticPages.length > 0 && [
      '### Other Pages',
      ...staticPages.map(page => `- [${page.title}](${baseUrl}/${page.path}): ${page.description}`),
    ],
    statsPage && `- [${statsPage.title}](${baseUrl}/stats): ${statsPage.description}`,
  ]
    .flat()
    .filter(Boolean)
    .join('\n');

  const statsLinks = statsSubpages
    .map(page => `- [${page.title}](${baseUrl}/${page.path}): ${page.description}`)
    .join('\n');

  return [
    `# ${siteTitle}`,
    '',
    `> ${siteDescription}`,
    '',
    `Daily word-of-the-day site with curated vocabulary selections.${curatorInfo}${lastUpdated ? ` Last updated: ${lastUpdated}.` : ''}`,
    '',
    '## Recent Words (Last 5)',
    '',
    recentWordSection,
    '',
    '## Pages',
    '',
    pagesLinks,
    '',
    '## Word Statistics',
    '',
    statsLinks,
    '',
    'Each word includes definition, pronunciation, etymology, and usage examples.',
    '',
  ].join('\n');
}

/**
 * Gets the content for a specific static file
 *
 * @param pathname - The pathname of the requested file (e.g., '/robots.txt')
 * @param siteUrl - The base URL of the site (required for robots.txt)
 * @returns The content of the requested file, or null if not a supported static file
 */
export function getStaticFileContent(pathname: string, words: WordData[], siteUrl?: string): string | null {
  // Remove leading slash if present
  const filename = pathname.startsWith('/') ? pathname.substring(1) : pathname;

  // Only return content for the files we support
  if (!STATIC_FILES.includes(filename)) {
    return null;
  }

  switch (filename) {
    case 'robots.txt':
      return generateRobotsTxt(siteUrl || '');
    case 'humans.txt':
      return generateHumansTxt();
    case 'health.txt':
      return generateHealthTxt(words);
    case 'llms.txt':
      return generateLlmsTxt(words);
    default:
      return null;
  }
}
