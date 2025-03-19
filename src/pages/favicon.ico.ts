/**
 * Favicon endpoint to prevent dynamic route warnings
 * Redirects to the actual favicon in public directory
 */

export async function GET() {
  return new Response(null, {
    status: 301,
    headers: {
      'Location': '/favicon.svg',
    },
  });
}
