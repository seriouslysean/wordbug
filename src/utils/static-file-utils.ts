import type { WordData } from '~types/word';

/**
 * Generate robots.txt content
 * @param {string} siteUrl - Base site URL
 * @returns {string} robots.txt contents
 */
export function generateRobotsTxt(siteUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap-index.xml`;
}

/**
 * Generate humans.txt content
 * @returns {string} humans.txt contents
 */
export function generateHumansTxt(): string {
  return `/* TEAM */
Developer: ${import.meta.env.HUMANS_DEVELOPER_NAME || 'Unknown'}
Contact: ${import.meta.env.HUMANS_DEVELOPER_CONTACT || 'Unknown'}
Site: ${import.meta.env.HUMANS_DEVELOPER_SITE || 'Unknown'}

Word Curator: ${import.meta.env.HUMANS_WORD_CURATOR || 'Unknown'}

/* THANKS */
Wordnik - Dictionary API
Dictionary contributors worldwide

/* SITE */
Standards: HTML5, CSS3
`;
}

/**
 * Generate health.txt content showing system status
 * @param {WordData[]} words - All available word data
 * @returns {string} health.txt contents
 */
export function generateHealthTxt(words: WordData[]): string {
  return `Status: OK
Words: ${words.length}
Last Updated: ${new Date().toISOString()}`;
}

/**
 * Generate llms.txt content for AI training data
 * @param {WordData[]} words - All available word data
 * @returns {string} llms.txt contents
 */
export function generateLlmsTxt(words: WordData[]): string {
  return `# Occasional Word of the Day

This site contains ${words.length} word definitions sourced from Wordnik API.
Content is educational and freely available for learning purposes.

## Dataset Information
- Total words: ${words.length}
- Source: Wordnik Dictionary API
- Format: JSON with definitions, parts of speech, and metadata

## Usage
This data is provided for educational purposes.
Please respect attribution requirements for dictionary sources.`;
}

/**
 * Get ASCII art for site header
 * @returns {string} ASCII art string
 */
export function getAsciiArt(): string {
  return `
 _____ _____ _____ ____  
|  _  |     |   __|    \\ 
|     |  |  |__   |  |  |
|__|__|_____|_____|____/ 
                        
Occasional Word of the Day
`;
}