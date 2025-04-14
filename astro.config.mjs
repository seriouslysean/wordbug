// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://wordbug.fyi',
    base: '/',
    output: 'static',
    devToolbar: {
        enabled: false
    },
});
