/**
 * Build-time configuration - hardcoded during build process
 * This data is safe to expose in the browser
 */

import pkg from '../../package.json' with { type: 'json' };

export interface BuildData {
  version: string;
  sha: string;
  release: string;
  timestamp: string;
}

/**
 * Gets build-time data that will be injected into the client
 * This function is evaluated at build time and data is hardcoded
 * @returns {Object} Build data for browser exposure
 */
export function getBuildData(): BuildData {
  const githubSha = import.meta.env.GITHUB_SHA || 'local';
  const shortSha = githubSha.slice(0, 7);

  return {
    version: pkg.version,
    sha: shortSha,
    release: `${pkg.name}@${pkg.version}+${shortSha}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Gets the namespace key for window object
 * @returns {string} Namespace key name
 */
export function getNamespaceKey(): string {
  return pkg.name;
}
