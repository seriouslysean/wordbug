import { defineConfig } from 'astro/config';

const site = process.env.BASE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '';

// https://astro.build/config
export default defineConfig({
    site,
    base,
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
