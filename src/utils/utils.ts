/**
 * Constructs a URL with the base URL if configured
 * @param path - Path to append to base URL
 * @returns Complete URL
 * @throws {Error} - If path format is invalid
 */
export const getUrl = (path: string): string => {
    const baseUrl = import.meta.env.BASE_URL;
    const effectiveBase = (baseUrl === undefined || baseUrl === '') ? '/' : baseUrl;

    if (!path) {
        return effectiveBase.endsWith('/') ? effectiveBase : `${effectiveBase}/`;
    }

    if (path !== '/' && /\/\/+/.test(path)) {
        throw new Error('Invalid path: contains multiple consecutive slashes');
    }

    const cleanBase = effectiveBase.endsWith('/') ? effectiveBase.slice(0, -1) : effectiveBase;

    if (path === '/') {
        return `${cleanBase}/`;
    }

    const cleanPath = path.replace(/^\//, '');
    const url = `${cleanBase}/${cleanPath}`;
    return path.endsWith('/') ? url : url.replace(/\/$/, '');
};

