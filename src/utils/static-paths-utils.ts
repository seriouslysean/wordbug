import { getAllWords } from '~utils/word-data-utils';
import {
  getChronologicalMilestones,
  getCurrentStreakStats,
  getLetterPatternStats,
  getLetterStats,
  getLongestStreakWords,
  getWordEndingStats,
  getWordStats,
} from '~utils/word-stats-utils';

const ordinal = (n: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = n % 100;
  return n + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
};

export const generateStatsStaticPaths = () => {
  const words = getAllWords();
  const showEmptyPages = __SHOW_EMPTY_STATS__;
  const stats = [];

  const suffixDescriptions = {
    ed: `Words ending with the suffix '-ed', typically indicating past tense or past participle forms.`,
    ing: `Words ending with the suffix '-ing', typically indicating present participle or gerund forms.`,
    ly: `Words ending with the suffix '-ly', typically forming adverbs.`,
    ness: `Words ending with the suffix '-ness', typically forming abstract nouns expressing a state or quality.`,
    ful: `Words ending with the suffix '-ful', meaning 'full of' or 'characterized by' a particular quality.`,
    less: `Words ending with the suffix '-less', meaning 'without' or 'lacking' a particular quality.`,
  };

  const endings = getWordEndingStats(words);
  for (const suffix of Object.keys(suffixDescriptions)) {
    const endingWords = endings[suffix as keyof typeof endings] || [];
    if (showEmptyPages || endingWords.length > 0) {
      stats.push({
        params: { stat: `words-ending-${suffix}` },
        props: {
          words: endingWords.map((w, i) => ({ ...w, label: ordinal(i + 1) })),
          description: suffixDescriptions[suffix as keyof typeof suffixDescriptions],
          template: 'word-list',
        },
      });
    }
  }

  const letterPatterns = getLetterPatternStats(words);
  const patterns = [
    {
      key: 'alphabetical-order',
      data: letterPatterns.alphabetical,
      description: 'Words with three or more consecutive letters in alphabetical order.',
    },
    {
      key: 'double-letters',
      data: letterPatterns.doubleLetters,
      description: 'Words containing double letters (the same letter appearing twice in a row).',
    },
    {
      key: 'triple-letters',
      data: letterPatterns.tripleLetters,
      description: 'Words containing triple letters (the same letter appearing three or more times in a row).',
    },
    {
      key: 'same-start-end',
      data: letterPatterns.startEndSame,
      description: 'Words that begin and end with the same letter.',
    },
  ];

  patterns.forEach(({ key, data, description }) => {
    stats.push({
      params: { stat: key },
      props: {
        words: data.map((w, i) => ({
          word: w.word,
          date: w.date,
          label: ordinal(i + 1),
        })),
        description,
        template: 'word-list',
      },
    });
  });

  const letterStats = getLetterStats(getWordStats(words).letterFrequency);
  const mostCommon = letterStats[0];
  const leastCommon = letterStats[letterStats.length - 1];

  const letterFrequencyStats = [
    {
      key: 'most-common-letter',
      letter: mostCommon,
      words: mostCommon ? words.filter(w => w.word.includes(mostCommon[0])) : [],
    },
    {
      key: 'least-common-letter',
      letter: leastCommon,
      words: leastCommon ? words.filter(w => w.word.includes(leastCommon[0])) : [],
    },
  ];

  letterFrequencyStats.forEach(({ key, letter, words: filteredWords }) => {
    stats.push({
      params: { stat: key },
      props: {
        words: filteredWords.map((w, i) => ({
          word: w.word,
          date: w.date,
          label: ordinal(i + 1),
        })),
        description: letter
          ? `Words containing the letter "${letter[0]}" (appears in ${letter[1]} words).`
          : 'No letter frequency data available.',
        template: 'word-list',
      },
    });
  });

  const milestoneWords = getChronologicalMilestones([...words].sort((a, b) => a.date.localeCompare(b.date)))
    .map(w => ({
      word: w.word.word,
      date: w.word.date,
      label: `${ordinal(w.milestone)} Word`,
    }));

  stats.push({
    params: { stat: 'milestone-words' },
    props: {
      words: milestoneWords,
      description: `Important word milestones from our collection's chronological journey.`,
      template: 'milestone',
    },
  });

  const streakStats = getCurrentStreakStats([...words].sort((a, b) => b.date.localeCompare(a.date)));
  const currentStreakWords = [];

  if (streakStats.currentStreak > 0) {
    const sorted = [...words].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < streakStats.currentStreak && i < sorted.length; i++) {
      currentStreakWords.push({
        word: sorted[i].word,
        date: sorted[i].date,
        label: `${ordinal(i + 1)} Day`,
      });
    }
    currentStreakWords.reverse();
  }

  const longestStreakWords = getLongestStreakWords(words).map((w, i) => ({
    word: w.word,
    date: w.date,
    label: `${ordinal(i + 1)} Day`,
  }));


  const streakConfigs = [
    {
      key: 'current-streak',
      words: currentStreakWords,
      description: `Words from the current ${streakStats.currentStreak}-word streak.`,
      template: 'milestone',
    },
    {
      key: 'longest-streak',
      words: longestStreakWords,
      description: `Words from the longest ${streakStats.longestStreak}-word streak.`,
      template: 'milestone',
    },
    {
      key: 'palindromes',
      words: getLetterPatternStats(words).palindromes.map((w, i) => ({
        word: w.word,
        date: w.date,
        label: ordinal(i + 1),
      })),
      description: `Total number of palindromes (words that read the same forwards and backwards) in our collection.`,
      template: 'word-list',
    },
  ];

  streakConfigs.forEach(({ key, words: streakWords, description, template }) => {
    stats.push({
      params: { stat: key },
      props: {
        words: streakWords,
        description,
        template,
      },
    });
  });

  return stats.filter(stat => showEmptyPages || (stat.props.words?.length > 0));
};
