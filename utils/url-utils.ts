import { FILE_PATH_PATTERN, ROUTES } from '#constants/urls';

/**
 * Get URL for words of a specific length
 * @param length - Word length (number or string)
 * @returns URL path for length-filtered words
 */
export const getLengthUrl = (length: number | string): string => {
  return ROUTES.LENGTH(Number(length));
};

/**
 * Get URL for words starting with a specific letter
 * @param letter - Starting letter
 * @returns URL path for letter-filtered words
 */
export const getLetterUrl = (letter: string): string => {
  return ROUTES.LETTER(letter);
};

/**
 * Get URL for words with a specific part of speech
 * @param partOfSpeech - Part of speech
 * @returns URL path for part-of-speech-filtered words
 */
export const getPartOfSpeechUrl = (partOfSpeech: string): string => {
  return ROUTES.PART_OF_SPEECH(partOfSpeech);
};

/**
 * Whether a path is the base path itself or sits below it. A bare
 * startsWith() would treat '/apple' as under '/app'; this requires the match
 * to end on a segment boundary. Compares literally, so a base containing
 * regex metacharacters is safe.
 * @param path - Path to test
 * @param base - Base path without a trailing slash
 * @returns True when path equals base or starts with base followed by '/'
 */
export const isPathUnderBase = (path: string, base: string): boolean =>
  path === base || path.startsWith(`${base}/`);

/**
 * The URL path a page or file is served at. Pages are built as directories
 * ('stats/index.html'), and a static host serves a directory at its
 * trailing-slash URL only: '/stats' is a redirect to '/stats/' on GitHub
 * Pages. A file ('/rss.xml') is served at its own name. The slash belongs to
 * the path, so a query string or fragment stays behind it: '/stats#top' is
 * '/stats/#top'.
 * @param path - URL path, with or without a query string or fragment
 * @returns The path, ending in a slash unless it names a file, then the
 * query string and fragment as given
 */
export const withTrailingSlash = (path: string): string => {
  const end = path.search(/[?#]/);
  const pathname = end === -1 ? path : path.slice(0, end);
  const served = pathname.endsWith('/') || FILE_PATH_PATTERN.test(pathname) ? pathname : `${pathname}/`;
  return served + path.slice(pathname.length);
};

/**
 * The URL path a route or file of the site is served at under a base path.
 * The base is always added: a route can begin with the base's own segment
 * ('/word/calm' under the base '/word' is served at '/word/word/calm/'), so
 * no path can be tested for already having it. A pathname that does carry
 * the base (Astro.url.pathname) is read back to its route first.
 * @param route - Route ('/stats') or file path ('/rss.xml') from the site
 * root, with or without a query string or fragment
 * @param basePath - Base path, '/' for the root; a trailing slash is ignored
 * @returns URL path with the base: a page ends in a slash, a file does not
 */
export const joinBasePath = (route: string, basePath: string): string => {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const rooted = route.startsWith('/') ? route : `/${route}`;
  return base + withTrailingSlash(rooted);
};

/**
 * The route a served page path stands for: Astro.url.pathname is
 * '/stats/' where the route, and every key derived from it, is '/stats'.
 * The root stays '/'.
 * @param pathname - Page pathname without the base path
 * @returns The path without its trailing slash
 */
export const withoutTrailingSlash = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
