import { generateWordDataHash,getAllWords } from './word-utils';

/**
 * List of supported static text files
 */
export const STATIC_FILES = [
  'robots.txt',
  'humans.txt',
  'health.txt',
];

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
    typeof __HUMANS_WORD_CURATOR__ !== 'undefined' && __HUMANS_WORD_CURATOR__ &&
      `Word Curator: ${__HUMANS_WORD_CURATOR__}`,
    typeof __HUMANS_DEVELOPER_NAME__ !== 'undefined' && __HUMANS_DEVELOPER_NAME__ &&
      `Developer: ${__HUMANS_DEVELOPER_NAME__}`,
    typeof __HUMANS_DEVELOPER_CONTACT__ !== 'undefined' && __HUMANS_DEVELOPER_CONTACT__ &&
      `Contact: ${__HUMANS_DEVELOPER_CONTACT__}`,
    typeof __HUMANS_DEVELOPER_SITE__ !== 'undefined' && __HUMANS_DEVELOPER_SITE__ &&
      `Site: ${__HUMANS_DEVELOPER_SITE__}`,
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
  const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0-dev';
  const release = typeof __RELEASE__ !== 'undefined' ? __RELEASE__ : 'occasional-wotd@dev';
  const buildTime = typeof __TIMESTAMP__ !== 'undefined' ? __TIMESTAMP__ : currentTime;
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
    default:
      return null;
  }
}
