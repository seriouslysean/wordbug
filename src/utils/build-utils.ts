/**
 * Build-time utilities - functions for generating build data
 * This data is safe to expose in the browser and uses Vite's define globals
 * Global constants are defined in src/types/vite-env.d.ts
 */

export interface BuildData {
  version: string;
  sha: string;
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
    version: __BUILD_VERSION__,
    sha: __BUILD_SHA__,
    release: __BUILD_RELEASE__,
    timestamp: __BUILD_TIMESTAMP__,
  };
}

/**
 * Gets the namespace key for window object
 * @returns {string} Namespace key name
 */
export function getNamespaceKey(): string {
  return __NAMESPACE_KEY__;
}
