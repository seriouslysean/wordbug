import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getHomepageWords } from '#astro-utils/word-data-utils';
import { paths } from '#config/paths';
import { getAllWords, getWordFiles } from '#tools/utils';

// The demo homepage spells the site title: the current word, then the four
// previous words below it.
const TITLE_WORDS = ['occasional', 'word', 'of', 'the', 'day'];
const TITLE_DATE = '20250121';
const RULE = 'The demo homepage must read "occasional word of the day" (20250117-20250121): date new demo words before 20250117';

// Component layer: the selection src/pages/index.astro calls, applied to the
// real demo words, which Vitest pins with SOURCE_DIR=demo.
describe('Homepage: demo dataset', () => {
  const { words, failures } = getAllWords();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads every word on the date its file name gives, as the site does', () => {
    expect(failures).toEqual([]);
    expect(words.map(word => word.date)).toEqual(getWordFiles().files.map(file => file.date));
    // The site's collection loads every JSON file below the words directory
    expect(words).toHaveLength(fs.globSync('**/*.json', { cwd: paths.words }).length);
  });

  it('dates no demo word after the title', () => {
    const later = words.filter(word => word.date > TITLE_DATE).map(word => `${word.date} ${word.word}`);

    expect(later, RULE).toEqual([]);
  });

  it.each(['2025-01-21', '2030-06-15'])('spells the site title on %s', (today) => {
    vi.setSystemTime(new Date(`${today}T12:00:00`));

    const { currentWord, previousWords } = getHomepageWords(words);

    expect([currentWord?.word, ...previousWords.map(word => word.word)], RULE).toEqual(TITLE_WORDS);
  });
});
