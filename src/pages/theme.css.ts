import {
  COLOR_PRIMARY, COLOR_PRIMARY_LIGHT, COLOR_PRIMARY_DARK,
  COLOR_DARK_PRIMARY, COLOR_DARK_PRIMARY_LIGHT, COLOR_DARK_PRIMARY_DARK,
  COLOR_DARK_BACKGROUND, COLOR_DARK_BACKGROUND_LIGHT,
  COLOR_DARK_TEXT, COLOR_DARK_TEXT_LIGHT, COLOR_DARK_BORDER,
} from 'astro:env/client';
import type { APIRoute } from 'astro';

/**
 * Per-site theme custom properties, served as a same-origin stylesheet.
 * Lives in an endpoint rather than an inline <style> so it is covered by the
 * Content Security Policy via `style-src 'self'` without per-build hashing.
 */
export const GET: APIRoute = () => {
  const lightVars = [
    `--color-primary: ${COLOR_PRIMARY}`,
    `--color-primary-light: ${COLOR_PRIMARY_LIGHT}`,
    `--color-primary-dark: ${COLOR_PRIMARY_DARK}`,
  ].join('; ');

  const darkOverrides = [
    COLOR_DARK_BACKGROUND && `--color-background: ${COLOR_DARK_BACKGROUND}`,
    COLOR_DARK_BACKGROUND_LIGHT && `--color-background-light: ${COLOR_DARK_BACKGROUND_LIGHT}`,
    COLOR_DARK_PRIMARY && `--color-primary: ${COLOR_DARK_PRIMARY}`,
    COLOR_DARK_PRIMARY_LIGHT && `--color-primary-light: ${COLOR_DARK_PRIMARY_LIGHT}`,
    COLOR_DARK_PRIMARY_DARK && `--color-primary-dark: ${COLOR_DARK_PRIMARY_DARK}`,
    COLOR_DARK_TEXT && `--color-text: ${COLOR_DARK_TEXT}`,
    COLOR_DARK_TEXT_LIGHT && `--color-text-light: ${COLOR_DARK_TEXT_LIGHT}`,
    COLOR_DARK_BORDER && `--color-border: ${COLOR_DARK_BORDER}`,
  ].filter(Boolean).join('; ');

  const css = [
    `:root { ${lightVars}; }`,
    darkOverrides && `@media (prefers-color-scheme: dark) { :root { color-scheme: light dark; ${darkOverrides}; } }`,
  ].filter(Boolean).join('\n');

  return new Response(css, {
    status: 200,
    headers: {
      'Content-Type': 'text/css',
    },
  });
};
