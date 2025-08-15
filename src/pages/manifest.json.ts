import type { APIRoute } from 'astro';

import { seoConfig } from '~astro-utils/seo-utils';
import { getUrl } from '~astro-utils/url-utils';

export const GET: APIRoute = async () => {
  const manifest = {
    name: __SITE_TITLE__,
    short_name: __SITE_ID__,
    description: __SITE_DESCRIPTION__,
    start_url: getUrl('/'),
    scope: getUrl('/'),
    display: "standalone",
    background_color: __COLOR_PRIMARY_DARK__,
    theme_color: __COLOR_PRIMARY_DARK__,
    orientation: "portrait-primary",
    categories: seoConfig.keywords,
    lang: "en-US",
    icons: [
      {
        src: getUrl('/favicon.svg'),
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
};