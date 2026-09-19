/**
 * Breadcrumb generation utilities
 * Generates breadcrumb navigation data from URL pathnames
 */

import { getPageTitle } from '#utils/page-metadata-utils';
import { isPathUnderBase } from '#utils/url-utils';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Generate breadcrumb items from a URL pathname
 * @param pathname - The URL pathname to parse
 * @param basePath - The base path to filter out (e.g., from BASE_PATH env var)
 * @returns Array of breadcrumb items with labels and hrefs
 */
export function generateBreadcrumbs(pathname: string, basePath?: string): BreadcrumbItem[] {
  // Clean the pathname - remove leading/trailing slashes
  const cleanPath = pathname.replaceAll(/^\/|\/$/g, '');
  
  // Remove base path if provided, only when it matches whole leading segments
  const cleanBase = basePath?.replaceAll(/^\/|\/$/g, '') ?? '';
  const pathWithoutBase = cleanBase && isPathUnderBase(cleanPath, cleanBase)
    ? cleanPath.slice(cleanBase.length).replace(/^\//, '')
    : cleanPath;
  
  // Return empty array for home page
  if (!pathWithoutBase) {
    return [];
  }
  
  const segments = pathWithoutBase.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return [];
  }
  
  // Build breadcrumbs progressively
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'home', href: '/' }
  ];
  
  segments.reduce((path, segment) => {
    const nextPath = `${path}/${segment}`;
    const title = getPageTitle(nextPath);

    breadcrumbs.push({
      label: title?.toLowerCase() || segment,
      href: nextPath
    });
    
    return nextPath;
  }, '');
  
  return breadcrumbs;
}