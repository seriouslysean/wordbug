/**
 * Utility function to generate URLs with proper base path handling
 * @param {string} path - The path to generate a URL for (must start with /)
 * @returns {string} The complete URL path with base path prefixed
 */
export function getUrl(path) {
    // If path doesn't start with /, return it unchanged
    if (!path.startsWith('/')) {
        return path;
    }

    const base = import.meta.env.BASE_URL || '/';
    return `${base.replace(/\/$/, '')}${path}`;
}
