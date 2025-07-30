import type { APIRoute } from 'astro';

import { generateLlmsTxt } from '~utils-client/static-file-utils';

export const GET: APIRoute = () => {
  const llmsTxt = generateLlmsTxt();

  return new Response(llmsTxt || '', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};