import type { APIRoute } from 'astro';
import { getWordsFromCollection } from '#astro-utils/word-data-utils';
import { formatDate } from '#utils/date-utils';

export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();

  // Word + featured date, consumed by the header search (word-list-style rows)
  // and the random-word button (which reads only `word`).
  const words = allWords.map(wordData => ({
    word: wordData.word,
    date: formatDate(wordData.date),
  }));

  return new Response(JSON.stringify(words), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};