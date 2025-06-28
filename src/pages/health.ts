import { getBuildData } from '~config/build-config.ts';

export function GET() {
  const buildData = getBuildData();

  return new Response(
    JSON.stringify({
      status: 'ok',
      ...buildData,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
