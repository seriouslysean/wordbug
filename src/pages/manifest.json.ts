import { SITE_TITLE, SITE_ID, SITE_DESCRIPTION, COLOR_PRIMARY_DARK } from 'astro:env/client';
import type { APIRoute } from 'astro';

import { seoConfig } from '#astro-utils/seo-utils';
import { getUrl } from '#astro-utils/url-utils';

export const GET: APIRoute = async () => {
  const manifest = {
    name: SITE_TITLE,
    short_name: SITE_ID,
    description: SITE_DESCRIPTION,
    start_url: getUrl('/'),
    scope: getUrl('/'),
    display: "standalone",
    background_color: COLOR_PRIMARY_DARK,
    theme_color: COLOR_PRIMARY_DARK,
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