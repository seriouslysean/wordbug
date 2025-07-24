import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatDate } from '~utils/date-utils';
import { getAllPageMetadata } from '~utils/page-metadata';
import { generateWordDataHash,getAllWords } from '~utils/word-utils';

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
  // Ensure siteUrl is valid, with a fallback for dev environments
  const baseUrl = !siteUrl ? 'http://localhost:4321' :
                 siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

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
 * @returns The content for health.txt
 */
export function generateHealthTxt(): string {
  // Get the current time for timestamp
  const currentTime = new Date().toISOString();
  // Use Vite's injected constants, which will be replaced at build time
  const version = __VERSION__;
  const release = __RELEASE__;
  const buildTime = __TIMESTAMP__;
  // Get all words and hash
  const words = getAllWords();
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
 * @returns The content for llms.txt or null if required data is missing
 */
export function generateLlmsTxt(): string | null {
  const siteTitle = __SITE_TITLE__;
  const siteDescription = __SITE_DESCRIPTION__;
  const siteUrl = process.env.SITE_URL;

  if (!siteTitle || !siteDescription || !siteUrl) {
    return null;
  }

  const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const words = getAllWords();
  const recentWords = words.slice(-5);

  const curatorInfo = __HUMANS_WORD_CURATOR__ ? ` Curated by ${__HUMANS_WORD_CURATOR__}.` : '';
  const lastUpdated = words.length > 0 ? formatDate(words[words.length - 1].date) : null;

  const recentWordLinks = recentWords
    .map(word => `- [${word.word}](${baseUrl}/${word.word}): ${formatDate(word.date)}`)
    .join('\n');

  // Get all pages and group by category
  const allPages = getAllPageMetadata();
  const pagesByCategory = allPages.reduce((acc, page) => {
    if (!acc[page.category]) {
acc[page.category] = [];
}
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, typeof allPages>);

  const pagesLinks = pagesByCategory.pages
    ?.map((page: { title: string; path: string; description: string }) => `- [${page.title}](${baseUrl}/${page.path}): ${page.description}`)
    .join('\n') || '';

  const statsLinks = pagesByCategory.stats
    ?.map((page: { title: string; path: string; description: string }) => `- [${page.title}](${baseUrl}/${page.path}): ${page.description}`)
    .join('\n') || '';

  return `# ${siteTitle}

> ${siteDescription}

Daily word-of-the-day site with curated vocabulary selections.${curatorInfo}${lastUpdated ? ` Last updated: ${lastUpdated}.` : ''}

## Recent Words (Last 5)

${recentWordLinks}

## Pages

${pagesLinks}
- [Current Word](${baseUrl}): Today's featured word

## Word Statistics

${statsLinks}

Each word includes definition, pronunciation, etymology, and usage examples.
`;
}

/**
 * Gets the content for a specific static file
 *
 * @param pathname - The pathname of the requested file (e.g., '/robots.txt')
 * @param siteUrl - The base URL of the site (required for robots.txt)
 * @returns The content of the requested file, or null if not a supported static file
 */
export function getStaticFileContent(pathname: string, siteUrl?: string): string | null {
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
      return generateHealthTxt();
    case 'llms.txt':
      return generateLlmsTxt();
    default:
      return null;
  }
}
