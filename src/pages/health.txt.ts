import type { APIRoute } from 'astro';

import { generateHealthTxt } from '~utils-client/static-file-utils';
import { getWordsFromCollection } from '~utils-client/word-data-utils';

export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();
  const healthTxt = generateHealthTxt(allWords);

  return new Response(healthTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};