import { GA_MEASUREMENT_ID } from 'astro:env/client';
import type { APIRoute } from 'astro';

/**
 * Google Analytics bootstrap, served as a same-origin script so it is covered
 * by the Content Security Policy via `script-src 'self'` instead of an inline
 * hash. Only referenced from the layout when GA is enabled; emits nothing when
 * no measurement id is configured.
 */
export const GET: APIRoute = () => {
  const js = GA_MEASUREMENT_ID
    ? [
      'window.dataLayer = window.dataLayer || [];',
      'function gtag(){dataLayer.push(arguments);}',
      'gtag(\'js\', new Date());',
      `gtag('config', '${GA_MEASUREMENT_ID}', {`,
      '  cookie_flags: \'SameSite=None;Secure\',',
      '  allow_google_signals: false,',
      '  allow_ad_personalization_signals: false',
      '});',
    ].join('\n')
    : '';

  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript',
    },
  });
};
