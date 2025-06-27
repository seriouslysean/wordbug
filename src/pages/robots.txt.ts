import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('Site URL is required in astro.config.mjs');
  }
  const siteUrl = site.toString();
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${siteUrl}${siteUrl.endsWith('/') ? '' : '/'}sitemap-index.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
