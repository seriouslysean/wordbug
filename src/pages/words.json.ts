import type { APIRoute } from 'astro';
import { getWordsFromCollection } from '#astro-utils/word-data-utils';

export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();
  
  // Return just the word names for lightweight random selection
  const wordNames = allWords.map(wordData => wordData.word);
  
  return new Response(JSON.stringify(wordNames), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};