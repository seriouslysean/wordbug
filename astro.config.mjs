import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    base: process.env.BASE_PATH || '',
    devToolbar: {
        enabled: false
    },
    vite: {
        resolve: {
            extensions: ['.js', '.jsx', '.json']
        }
    }
});
