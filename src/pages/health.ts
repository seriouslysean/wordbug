import { getWebsiteHealthData } from '~utils/version-utils.js';

export function GET() {
  const healthData = getWebsiteHealthData();

  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...healthData,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
