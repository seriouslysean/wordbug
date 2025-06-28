import { getBuildData } from '~utils/build-utils.ts';

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
