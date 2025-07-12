import type { APIRoute } from 'astro';

import { generateHumansTxt } from '~utils/static-file-utils';

export const GET: APIRoute = () => {
  const humansTxt = generateHumansTxt();

  return new Response(humansTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
