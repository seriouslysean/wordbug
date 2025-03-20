/**
 * Constructs a URL with the base URL if configured
 * @param {string} path - Path to append to base URL
 * @returns {string} - Complete URL
 * @throws {Error} - If path format is invalid
 */
export const getUrl = (path) => {
    // Get base URL, defaulting to '/' if not set or empty
    const baseUrl = import.meta.env.BASE_URL;
    const effectiveBase = (baseUrl === undefined || baseUrl === '') ? '/' : baseUrl;

    // Handle empty, null, or undefined paths - return base URL with trailing slash
    if (!path) {
        return effectiveBase.endsWith('/') ? effectiveBase : `${effectiveBase}/`;
    }

    // Validate path format
    if (path !== '/' && /\/\/+/.test(path)) {
        throw new Error('Invalid path: contains multiple consecutive slashes');
    }

    // Clean up the base URL - remove trailing slash
    const cleanBase = effectiveBase.endsWith('/') ? effectiveBase.slice(0, -1) : effectiveBase;

    // For root path, return base URL with trailing slash
    if (path === '/') {
        return `${cleanBase}/`;
    }

    // Clean up the path - remove leading slash only
    const cleanPath = path.replace(/^\//, '');

    // Join base and path
    const url = `${cleanBase}/${cleanPath}`;

    // Preserve trailing slash if it was in the original path
    return path.endsWith('/') ? url : url.replace(/\/$/, '');
};

