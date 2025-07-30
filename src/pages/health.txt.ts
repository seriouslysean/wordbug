import type { APIRoute } from 'astro';

import { generateHealthTxt } from '~utils-client/static-file-utils';

export const GET: APIRoute = () => {
  const healthTxt = generateHealthTxt();

  return new Response(healthTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};