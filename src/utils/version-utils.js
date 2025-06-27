/**
 * Utilities for handling version information across the site
 * Values are hardcoded during build time for browser compatibility
 */

import pkg from '../../package.json' with { type: 'json' };

/**
 * Get website health data used in the health endpoint and window.wordbug
 * This is evaluated at build time and hardcoded into the final bundle
 *
 * @returns {Object} Object containing version and commit SHA
 */
export function getWebsiteHealthData() {
  // This will be evaluated and hardcoded at build time
  return {
    version: pkg.version,
    sha: import.meta.env.GITHUB_SHA || 'local',
  };
}
