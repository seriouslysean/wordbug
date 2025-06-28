export interface BuildData {
  version: string;
  shortSha: string;
  release: string;
  timestamp: string;
}

/**
 * Gets build-time data that was injected at build time
 * All values are compile-time constants from Vite's define
 * @returns {Object} Build data for browser exposure
 */
export function getBuildData(): BuildData {
  return {
    version: __VERSION__,
    release: __RELEASE__,
    timestamp: __TIMESTAMP__,
  };
}

