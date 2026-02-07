import type { APIRoute } from 'astro';

import { generateLlmsTxt } from '#astro-utils/static-file-utils';
import { getWordsFromCollection } from '#astro-utils/word-data-utils';

/**
 * Handle llms.txt requests
 * @returns Plain text llms.txt content
 */
export const GET: APIRoute = async () => {
  const allWords = await getWordsFromCollection();
  const llmsTxt = generateLlmsTxt(allWords);

  return new Response(llmsTxt || '', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};