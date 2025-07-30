import type { APIRoute } from 'astro';

import { generateRobotsTxt } from '~utils-client/static-file-utils';

export const GET: APIRoute = () => {
  const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4321';
  const robotsTxt = generateRobotsTxt(siteUrl);

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
