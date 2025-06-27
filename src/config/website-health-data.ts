/**
 * Gets the website health data that will be used in health endpoint and window.wordbug
 * This follows Astro best practices by using a function that can be called in frontmatter
 * and safely serialized for client use
 */
export function getWebsiteHealthData() {
  return {
    version: import.meta.env.npm_package_version || '0.0.0',
    sha: import.meta.env.GITHUB_SHA || 'local',
  };
}
