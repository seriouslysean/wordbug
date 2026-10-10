import { SITE_URL } from 'astro:env/client';
import type { APIRoute } from 'astro';

import { generateRobotsTxt } from '#astro-utils/static-file-utils';

/**
 * Handle robots.txt requests
 * @returns Plain text robots.txt content
 */
export const GET: APIRoute = () => {
  const siteUrl = SITE_URL;
  if (!siteUrl) {
    throw new Error('SITE_URL environment variable is required for robots.txt generation');
  }
  const robotsTxt = generateRobotsTxt(siteUrl);

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
