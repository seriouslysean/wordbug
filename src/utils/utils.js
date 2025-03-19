/**
 * Constructs a URL with the base URL if configured
 * @param {string} path - Path to append to base URL
 * @returns {string} - Complete URL
 */
export const getUrl = (path) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${cleanBase}${cleanPath}`;
};

