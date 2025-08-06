import type { APIRoute } from 'astro';

import { generateHumansTxt } from '~utils-client/static-file-utils';

/**
 * Handle humans.txt requests
 * @returns Plain text humans.txt content
 */
export const GET: APIRoute = () => {
  const humansTxt = generateHumansTxt();

  return new Response(humansTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
