import { SITE_TITLE, SITE_SHORT_NAME, SITE_DESCRIPTION, SITE_LOCALE, COLOR_PRIMARY_DARK } from 'astro:env/client';
import type { APIRoute } from 'astro';

import { getUrl } from '#astro-utils/url-utils';

export const GET: APIRoute = async () => {
  const manifest = {
    name: SITE_TITLE,
    // Optional in the manifest: without it a launcher shortens `name` itself
    ...(SITE_SHORT_NAME ? { short_name: SITE_SHORT_NAME } : {}),
    description: SITE_DESCRIPTION,
    start_url: getUrl('/'),
    scope: getUrl('/'),
    display: "standalone",
    background_color: COLOR_PRIMARY_DARK,
    theme_color: COLOR_PRIMARY_DARK,
    orientation: "portrait-primary",
    lang: SITE_LOCALE,
    icons: [
      {
        src: getUrl('/favicon.svg'),
        sizes: "any",
        type: "image/svg+xml",
        // The favicon has no safe zone, so it is not offered for masking
        purpose: "any"
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