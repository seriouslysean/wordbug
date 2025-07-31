import type { APIRoute } from 'astro';

import { generateLlmsTxt } from '~utils-client/static-file-utils';
import { getWordsFromCollection } from '~utils-client/word-data-utils';

export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();
  const llmsTxt = generateLlmsTxt(allWords);

  return new Response(llmsTxt || '', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};