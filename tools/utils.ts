import { createHash } from 'node:crypto';
import fs from 'node:fs';
import opentype from 'opentype.js';
import path from 'node:path';
import sharp from 'sharp';

import { fetchWithFallback } from '#adapters';
import { getWordRelations } from '#adapters/wordnet';
import type { WordRelations } from '#adapters/wordnet';
import { paths } from '#config/paths';
import type { CreateWordEntryResult, DictionaryResponse, WordData, WordEnrichment } from '#types';
import { resolveHexColor } from '#utils/color-utils';
import { formatDate, isValidDate } from '#utils/date-utils';
import { getSocialCardPath, SOCIAL_DIR } from '#utils/image-path-utils';
import { getErrorMessage, logger } from '#utils/logger';
import { collapseWhitespace } from '#utils/text-utils';
import { isRecord, isString } from '#utils/type-guards';
import { findValidDefinition, mergeEnrichment } from '#utils/word-data-utils';
import { parseWordData } from '#utils/stored-word-validation';

// ---------------------------------------------------------------------------
// Image generation constants
// ---------------------------------------------------------------------------

// Read when a card is drawn, not at import: add-word and regenerate-all-words
// import this module but never draw, so a bad color must not stop them.
const getImageColors = () => ({
  primary: resolveHexColor('COLOR_PRIMARY', process.env.COLOR_PRIMARY, '#9a3412'),
  primaryLight: resolveHexColor('COLOR_PRIMARY_LIGHT', process.env.COLOR_PRIMARY_LIGHT, '#c2410c'),
  primaryDark: resolveHexColor('COLOR_PRIMARY_DARK', process.env.COLOR_PRIMARY_DARK, '#7c2d12'),
  textLighter: '#8a8f98',
});

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
// 5% of shortest dimension
const PADDING = Math.floor(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.05);
const FONT_SIZE = 160;
const TITLE_SIZE = 48;
const DATE_SIZE = 40;
// 20% of font size
const DESCENDER_OFFSET = Math.floor(FONT_SIZE * 0.2);
const MAX_WIDTH = CANVAS_WIDTH - (PADDING * 2);

const PNG_OPTIONS = {
  compressionLevel: 9,
  palette: true,
  quality: 90,
  colors: 128,
} as const;

const SOCIAL_BASE_DIR = path.join(paths.images, SOCIAL_DIR);
const SETTINGS_HASH_FILENAME = '.image-settings-hash';

// Fixed inputs rendered through the real template to fingerprint it. A short
// word is drawn at full size, so the long probe (45 letters, the length of
// the longest dictionary word, over three times the card's width) is what
// makes MAX_WIDTH and the scaling that fits a long word to the card part of
// the fingerprint.
const PROBE_TEXT = 'probe';
const LONG_PROBE_TEXT = PROBE_TEXT.repeat(9);
const PROBE_DATE = '20240101';

interface LoadedFont {
  font: ReturnType<typeof opentype.parse>;
  fingerprint: string;
}

interface ImageFonts {
  regular: LoadedFont;
  bold: LoadedFont;
}

// md5 here is a non-security content fingerprint, as in the settings hash.
const fingerprint = (content: string | Buffer): string =>
  createHash('md5').update(content).digest('hex');

// Liberation Sans for better web compatibility.
// opentype.js v2 removed loadSync; parse a read buffer instead
const loadFont = (fileName: string): LoadedFont => {
  const bytes = fs.readFileSync(path.join(paths.fonts, 'liberation-sans', fileName));
  return { font: opentype.parse(bytes), fingerprint: fingerprint(bytes) };
};

const fontCache: { value: ImageFonts | null } = { value: null };

/**
 * Parses both fonts on the first image, so tools that import this module
 * without rendering (add-word --help, regenerate-all-words) never pay for it.
 */
const getFonts = (): ImageFonts => {
  fontCache.value ??= {
    regular: loadFont('LiberationSans-Regular.ttf'),
    bold: loadFont('LiberationSans-Bold.ttf'),
  };
  return fontCache.value;
};

// ---------------------------------------------------------------------------
// Word file I/O
// ---------------------------------------------------------------------------

interface WordFileInfo {
  word: string;
  date: string;
  path: string;
}

interface WordFileScan {
  files: WordFileInfo[];
  /** Directories and files that could not be read, each already logged */
  failures: string[];
}

interface WordFileScanOptions {
  /**
   * Reads a words directory that is missing or holds no word file as an empty
   * corpus instead of a failure. Duplicate detection sets it: a new site's
   * first word has nothing to collide with. Bulk tools need data and leave it
   * off.
   */
  allowEmpty?: boolean;
}

/**
 * Lists the word files in the data directory, newest first. Anything that
 * cannot be read is logged and reported in `failures` instead of silently
 * left out: a bulk tool counts it, so a partial corpus cannot pass for a
 * complete one. Single-word lookups may ignore it.
 */
export const getWordFiles = ({ allowEmpty = false }: WordFileScanOptions = {}): WordFileScan => {
  const exists = fs.existsSync(paths.words);
  const years = exists ? fs.readdirSync(paths.words).filter(dir => /^\d{4}$/.test(dir)) : [];

  const failures: string[] = [];
  const files = years.flatMap(year => {
    try {
      const yearDir = path.join(paths.words, year);
      // Dotfiles are not word files: macOS writes an AppleDouble file
      // (._20250701.json) beside each file copied to a non-Apple volume.
      const jsonFiles = fs.readdirSync(yearDir)
        .filter(file => file.endsWith('.json') && !file.startsWith('.'));

      return jsonFiles.flatMap(file => {
        try {
          const filePath = path.join(yearDir, file);
          // Only the headword is read here, so a file regenerate-all-words can
          // still repair (any other field missing) stays listed.
          const data: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!isRecord(data) || !isString(data.word)) {
            throw new Error('Word file has no "word" string');
          }
          return [{ word: data.word, date: file.replace('.json', ''), path: filePath }];
        } catch (error) {
          logger.error('Failed to read word file', { file, error: getErrorMessage(error) });
          failures.push(path.join(yearDir, file));
          return [];
        }
      });
    } catch (error) {
      logger.error('Failed to read year directory', { year, error: getErrorMessage(error) });
      failures.push(path.join(paths.words, year));
      return [];
    }
  });

  // No word file and nothing unreadable to account for it: the directory is
  // missing, has no year in it, or has years with no file in them, which a
  // failed first add-word leaves (it makes the year directory before fetching)
  if (files.length === 0 && failures.length === 0 && !allowEmpty) {
    logger.error(exists ? 'No word files found' : 'Word directory does not exist', { path: paths.words });
    return { files: [], failures: [paths.words] };
  }

  // Sort by date (newest first) for consistency
  return { files: files.toSorted((a, b) => b.date.localeCompare(a.date)), failures };
};

interface WordLookup {
  match: WordData | null;
  /** Directories and files the scan could not read, each already logged */
  failures: string[];
}

/**
 * Checks if a word already exists by scanning word files. A words directory
 * that is missing or holds no word file is logged at error unless the caller
 * sets `allowEmpty`, as add-word's duplicate check does: there nothing exists
 * yet, which is not a fault. A lookup that needs the word (generate-images
 * --word) leaves it off
 * and reads `failures`: with no match and a failed scan, the word may be in
 * what could not be read, so a mistyped SOURCE_DIR is reported as such, not
 * as a missing word.
 */
export function findExistingWord(word: string, options: WordFileScanOptions = {}): WordLookup {
  const lowerWord = word.toLowerCase();
  const { files, failures } = getWordFiles(options);
  const parseFailures: string[] = [];

  for (const file of files) {
    try {
      const data = parseWordData(fs.readFileSync(file.path, 'utf-8'), file.path);
      if (data.word.toLowerCase() === lowerWord) {
        return { match: data, failures: [...failures, ...parseFailures] };
      }
    } catch (error) {
      logger.error('Failed to parse word file', { path: file.path, error: getErrorMessage(error) });
      parseFailures.push(file.path);
    }
  }

  return { match: null, failures: [...failures, ...parseFailures] };
}

interface WordCorpus {
  words: WordData[];
  /** Directories and files that could not be read or parsed, each already logged */
  failures: string[];
}

/**
 * Reads every stored word. Files that cannot be read or are not valid word
 * data are logged and reported in `failures`, as in getWordFiles.
 */
export function getAllWords(): WordCorpus {
  const { files, failures } = getWordFiles();
  const parseFailures: string[] = [];
  const words = files.flatMap(file => {
    try {
      return [parseWordData(fs.readFileSync(file.path, 'utf-8'), file.path)];
    } catch (error) {
      logger.error('Failed to parse word file', { path: file.path, error: getErrorMessage(error) });
      parseFailures.push(file.path);
      return [];
    }
  });
  return { words, failures: [...failures, ...parseFailures] };
}

// ---------------------------------------------------------------------------
// SVG / image generation
// ---------------------------------------------------------------------------

interface TextPathResult {
  pathData: string;
  width: number;
  height: number;
  scale: number;
  transform: string;
}

interface GetTextPathOptions {
  isExtraBold?: boolean;
  maxWidth?: number;
}

function getTextPath(text: string, fontSize: number, options: GetTextPathOptions = {}): TextPathResult {
  const { isExtraBold = false, maxWidth = Infinity } = options;
  const fonts = getFonts();
  const font = (isExtraBold ? fonts.bold : fonts.regular).font;
  const fontPath = font.getPath(text, 0, 0, fontSize);
  const bbox = fontPath.getBoundingBox();
  const width = bbox.x2 - bbox.x1;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const transform = scale < 1 ? ` transform="scale(${scale})"` : '';

  return {
    // getPath already emits SVG's y-down coordinates. toPathData flips Y by
    // default (opentype.js 2), which would mirror that upright text.
    pathData: fontPath.toPathData({ flipY: false }),
    width: width * scale,
    height: (bbox.y2 - bbox.y1) * scale,
    scale,
    transform,
  };
}

/**
 * Creates an SVG social image. When date is provided, it renders below the site title.
 * Throws before drawing anything when a color setting is malformed.
 */
export function createSvg(text: string, date?: string): string {
  const imageColors = getImageColors();
  // Each text is drawn on one line, where a line break would draw as a
  // missing-glyph box.
  const mainWord = getTextPath(collapseWhitespace(text), FONT_SIZE, { isExtraBold: true, maxWidth: MAX_WIDTH });
  const titleText = getTextPath(collapseWhitespace(process.env.SITE_TITLE || ''), TITLE_SIZE);
  const dateText = date ? getTextPath(formatDate(date), DATE_SIZE) : null;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <!-- White background -->
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="#ffffff"/>

    <defs>
        <linearGradient id="wordGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${imageColors.primaryLight}"/>
            <stop offset="60%" stop-color="${imageColors.primary}"/>
            <stop offset="100%" stop-color="${imageColors.primaryDark}"/>
        </linearGradient>
    </defs>

    <!-- Site title -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE})">
        <path d="${titleText.pathData}" fill="${imageColors.textLighter}"${titleText.transform}/>
    </g>
${dateText ? `
    <!-- Date -->
    <g transform="translate(${PADDING}, ${PADDING + TITLE_SIZE + DATE_SIZE + 16})">
        <path d="${dateText.pathData}" fill="${imageColors.textLighter}"${dateText.transform}/>
    </g>
` : ''}
    <!-- Main word -->
    <g transform="translate(${PADDING}, ${CANVAS_HEIGHT - PADDING - DESCENDER_OFFSET})">
        <path d="${mainWord.pathData}" fill="url(#wordGradient)"${mainWord.transform}/>
    </g>
</svg>`;
}

type RendererVersions = Readonly<Record<string, string | undefined>>;

interface ImageSettings {
  probes: string[];
  png: typeof PNG_OPTIONS;
  fonts: string[];
  renderer: [string, string | undefined][];
}

/**
 * Collects what determines the bytes of an image: the inputs and the
 * renderer. The probe SVGs come from the real template, so they carry the
 * colors, site title, dimensions and layout; the font fingerprints cover
 * glyphs the probe text does not use. The renderer versions are sharp, libvips
 * and the libraries bundled with it (librsvg, imagequant, libpng...): a sharp
 * upgrade re-quantizes the palette without any input changing. Entries are
 * sorted by code unit so the fingerprint depends on neither the order they
 * are reported in nor the locale: an Estonian collation puts zlib before
 * tiff, which would regenerate every image on that machine.
 */
export const getImageSettings = (rendererVersions: RendererVersions = sharp.versions): ImageSettings => {
  const fonts = getFonts();
  return {
    probes: [createSvg(PROBE_TEXT, PROBE_DATE), createSvg(PROBE_TEXT), createSvg(LONG_PROBE_TEXT)],
    png: PNG_OPTIONS,
    fonts: [fonts.regular.fingerprint, fonts.bold.fingerprint],
    renderer: Object.entries(rendererVersions).toSorted(([a], [b]) => Number(a > b) - Number(a < b)),
  };
};

/**
 * Fingerprints the image settings: the marker's `settings`.
 */
export const computeSettingsHash = (rendererVersions: RendererVersions = sharp.versions): string =>
  fingerprint(JSON.stringify(getImageSettings(rendererVersions))).slice(0, 12);

const MARKER_PATH = path.join(SOCIAL_BASE_DIR, SETTINGS_HASH_FILENAME);

/**
 * What a run knows about the images already on disk, read once before the
 * first image so every decision in the run uses the same snapshot and the
 * first regenerated image cannot make the rest look current.
 */
export interface ImageCache {
  /**
   * True when the settings differ from those of the last certified run, or no
   * run has recorded them in the current format: every image is re-rendered.
   */
  stale: boolean;
  /** Input hash of each card the last certified run rendered, by card path. */
  cards: Readonly<Record<string, string>>;
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(isString);

const readMarker = (): unknown => {
  try {
    return JSON.parse(fs.readFileSync(MARKER_PATH, 'utf-8'));
  } catch {
    return null;
  }
};

/**
 * Reads the marker a certified run wrote. A missing marker, or the bare
 * settings fingerprint older runs wrote, leaves the settings unknown, so the
 * next run renders everything once and records per-card inputs.
 */
export const readImageCache = (): ImageCache => {
  // Fingerprinted first, marker or not: the probes draw through the real
  // template, so a malformed setting fails the run here, once, before any
  // directory or image is written.
  const settings = computeSettingsHash();
  const marker = readMarker();
  if (!isRecord(marker) || !isString(marker.settings) || !isStringRecord(marker.cards)) {
    return { stale: true, cards: {} };
  }
  return { stale: marker.settings !== settings, cards: marker.cards };
};

/**
 * One card as a run saw it: its path relative to the images directory (the
 * marker's key), a hash of the inputs it was rendered from, and whether this
 * run rendered it.
 */
export interface CardRender {
  card: string;
  inputs: string;
  generated: boolean;
}

/**
 * Certifies the images on disk as rendered under the current settings from
 * the recorded inputs. Only a run that covered all words and all pages
 * without a failure may call this, with every card it saw; a single image or
 * a partial run says nothing about the rest of the corpus. The map is built
 * from this run alone, so cards that no longer exist drop out. Keys are
 * sorted by code unit so the file does not depend on run order or locale.
 */
export const markImageCacheCurrent = (rendered: readonly CardRender[]): void => {
  const cards = Object.fromEntries(
    rendered
      .toSorted((a, b) => Number(a.card > b.card) - Number(a.card < b.card))
      .map(({ card, inputs }): [string, string] => [card, inputs]),
  );
  fs.mkdirSync(SOCIAL_BASE_DIR, { recursive: true });
  fs.writeFileSync(MARKER_PATH, `${JSON.stringify({ settings: computeSettingsHash(), cards }, null, 2)}\n`);
};

export interface GenerateImageOptions {
  /** Render even when the recorded inputs match: forced, or the cache is stale */
  regenerate: boolean;
  cards: ImageCache['cards'];
}

/**
 * Renders a card unless the last certified run recorded the same inputs for
 * it and the file is still there. The inputs are exactly what createSvg
 * receives, so a card whose text changes while its path does not (a page
 * title derived from the corpus, a word whose case changed, which the file
 * name drops) is rendered again. The SVG is only built once it is needed.
 */
async function renderCard(
  card: string,
  text: string,
  date: string | undefined,
  options: GenerateImageOptions,
): Promise<CardRender> {
  const inputs = fingerprint(JSON.stringify([text, date ?? null])).slice(0, 12);
  const outputPath = path.join(paths.images, card);
  if (!options.regenerate && options.cards[card] === inputs && fs.existsSync(outputPath)) {
    return { card, inputs, generated: false };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(createSvg(text, date))).png(PNG_OPTIONS).toFile(outputPath);
  return { card, inputs, generated: true };
}

/**
 * Generates a social share image for a word, as written.
 */
export async function generateShareImage(
  word: string,
  date: string,
  options: GenerateImageOptions,
): Promise<CardRender> {
  return renderCard(getSocialCardPath({ type: 'word', word, date }), word, date, options);
}

/**
 * Generates a generic social share image for pages without a word.
 */
export async function generateGenericShareImage(
  title: string,
  slug: string,
  options: GenerateImageOptions,
): Promise<CardRender> {
  return renderCard(getSocialCardPath({ type: 'page', path: slug }), title.toLowerCase(), undefined, options);
}

// ---------------------------------------------------------------------------
// Word entry creation
// ---------------------------------------------------------------------------

/**
 * Merges adapter-captured headword data and WordNet relations into one
 * word-level enrichment object, omitting empty fields. Returns undefined when
 * there is nothing to store so absent enrichment self-hides on render.
 */
function composeEnrichment(
  headword: DictionaryResponse['headword'],
  relations: WordRelations | null,
): WordEnrichment | undefined {
  const enrichment: WordEnrichment = {};
  if (headword?.pronunciation) {
    enrichment.pronunciation = headword.pronunciation;
  }
  if (headword?.audio) {
    enrichment.audio = headword.audio;
  }
  if (headword?.etymology) {
    enrichment.etymology = headword.etymology;
  }
  if (relations?.synonyms.length) {
    enrichment.synonyms = relations.synonyms;
  }
  if (relations?.antonyms.length) {
    enrichment.antonyms = relations.antonyms;
  }
  if (relations?.related.length) {
    enrichment.related = relations.related;
  }
  return Object.keys(enrichment).length > 0 ? enrichment : undefined;
}

/**
 * Assembles the stored WordData from a dictionary response plus optional WordNet
 * relations. Shared by add-word and regenerate-all-words so a backfill produces
 * the same shape. `storedEnrichment` is what the file being replaced already
 * holds: fields the refresh does not supply are kept from it, so a backfill
 * never strips enrichment; `preserveCase` is carried the same way by the caller.
 */
export function buildWordData(params: {
  word: string;
  date: string;
  adapterName: string;
  response: DictionaryResponse;
  relations?: WordRelations | null;
  preserveCase?: boolean;
  storedEnrichment?: WordEnrichment;
}): WordData {
  const { word, date, adapterName, response, relations = null, preserveCase = false, storedEnrichment } = params;
  const enrichment = mergeEnrichment(storedEnrichment, composeEnrichment(response.headword, relations));
  const wordData: WordData = {
    word,
    date,
    adapter: adapterName,
    preserveCase,
    data: response.definitions,
  };
  if (enrichment) {
    wordData.enrichment = enrichment;
  }
  return wordData;
}

/**
 * The headword's primary part of speech (that of its first displayable
 * definition), normalized to a base type, used to focus WordNet relations on
 * the dominant sense. Undefined when no definition carries a usable POS, in
 * which case all senses are considered.
 */
export function primaryPartOfSpeech(definitions: DictionaryResponse['definitions']): string | undefined {
  return findValidDefinition(definitions)?.partOfSpeech;
}

/**
 * Looks up WordNet relations, swallowing failures so enrichment never blocks
 * word creation. The lookup is local, so this only guards against a missing or
 * corrupt WordNet database. Returns null when unavailable.
 */
export async function tryFetchRelations(word: string, partOfSpeech?: string): Promise<WordRelations | null> {
  try {
    // WordNet indexes lemmas in lowercase, so the lookup key is lowercased here
    // even for preserveCase words; the adapter looks up what it is given.
    return await getWordRelations(word.toLowerCase(), partOfSpeech);
  } catch (error) {
    logger.warn('WordNet enrichment failed, continuing without it', { word, error: getErrorMessage(error) });
    return null;
  }
}

interface CreateWordEntryOptions {
  date: string;
  overwrite?: boolean;
  preserveCase?: boolean;
}

/**
 * Creates a word data object and saves it to the appropriate file
 */
export async function createWordEntry(word: string, options: CreateWordEntryOptions): Promise<CreateWordEntryResult> {
  const { date, overwrite = false, preserveCase = false } = options;

  if (!word?.trim()) {
    throw new Error('Word is required');
  }

  if (!isValidDate(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYYMMDD format`);
  }

  if (!process.env.DICTIONARY_ADAPTER) {
    throw new Error('DICTIONARY_ADAPTER environment variable is required');
  }

  const trimmedWord = word.trim();
  const finalWord = preserveCase ? trimmedWord : trimmedWord.toLowerCase();
  const year = date.slice(0, 4);
  const dirPath = path.join(paths.words, year);
  const filePath = path.join(dirPath, `${date}.json`);

  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error(`Word already exists for date ${date}`);
  }

  fs.mkdirSync(dirPath, { recursive: true });

  // Fetch word data using finalWord (lowercased by default) so common words match
  // dictionary entries. When preserveCase is true, original capitalization is retained.
  const { response, adapterName } = await fetchWithFallback(finalWord);
  const relations = await tryFetchRelations(finalWord, primaryPartOfSpeech(response.definitions));
  const wordData = buildWordData({ word: finalWord, date, adapterName, response, relations, preserveCase });

  fs.writeFileSync(filePath, JSON.stringify(wordData, null, 4));

  logger.info('Word entry created', { word: finalWord, date });

  return { filePath, data: response.definitions };
}
