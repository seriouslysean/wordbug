import { afterEach, describe, expect, it } from 'vitest';
import { GET } from '#pages/manifest.json.ts';

// The endpoint takes Astro's APIContext and reads none of it
const getManifest = async (): Promise<Record<string, unknown>> => {
  const response = await Reflect.apply(GET, undefined, [{}]);
  return response.json();
};

describe('web app manifest', () => {
  afterEach(() => {
    mockEnv.SITE_SHORT_NAME = undefined;
  });

  it('names the app by the site title and leaves short_name out when none is set', async () => {
    const manifest = await getManifest();

    expect(manifest.name).toBe('Test Site');
    expect(manifest).not.toHaveProperty('short_name');
    expect(JSON.stringify(manifest)).not.toContain(mockEnv.SITE_ID);
  });

  it('starts and scopes the app at the site root, with its slash under a base path', async () => {
    expect(await getManifest()).toMatchObject({ start_url: '/', scope: '/' });

    mockEnv.BASE_PATH = '/vocab';

    // Scope is matched as a string prefix: '/vocab' would also claim '/vocabulary'
    expect(await getManifest()).toMatchObject({ start_url: '/vocab/', scope: '/vocab/' });
  });

  it('offers the favicon as a plain icon and claims no store categories', async () => {
    const manifest = await getManifest();

    expect(manifest.icons).toEqual([
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ]);
    expect(manifest).not.toHaveProperty('categories');
  });

  it('uses SITE_SHORT_NAME as the short name', async () => {
    mockEnv.SITE_SHORT_NAME = 'Test';

    expect((await getManifest()).short_name).toBe('Test');
  });
});
