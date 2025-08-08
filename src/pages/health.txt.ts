import type { APIRoute } from 'astro';

import { generateHealthTxt } from '~astro-utils/static-file-utils';
import { getWordsFromCollection } from '~astro-utils/word-data-utils';

/**
 * Handle health.txt requests
 * @returns Plain text health.txt content
 */
export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();
  const healthTxt = generateHealthTxt(allWords);

  return new Response(healthTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};