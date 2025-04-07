import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: process.env.BASE_URL?.replace(/\/$/, '') || 'http://localhost:4321',
    base: process.env.BASE_PATH || '',
    output: 'static',  // Explicitly set static output
    devToolbar: {
        enabled: false
    },
    build: {
        assets: 'assets'  // Put assets in a dedicated directory
    },
    vite: {
        resolve: {
            alias: {
                '~': '/src',
                '~components': '/src/components',
                '~layouts': '/src/layouts',
                '~utils': '/src/utils',
                '~data': '/src/data',
                '~styles': '/src/styles',
                '~config': '/src/config'
            }
        }
    }
});
