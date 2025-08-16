/**
 * Breadcrumb generation utilities
 * Generates breadcrumb navigation data from URL pathnames
 */

import { getPageMetadata } from './page-metadata-utils';

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
  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  
  // Remove base path if provided
  const pathWithoutBase = basePath && basePath !== '/' 
    ? cleanPath.replace(new RegExp(`^${basePath.replace(/^\/|\/$/g, '')}`), '').replace(/^\//, '')
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
    const metadata = getPageMetadata(nextPath);
    
    breadcrumbs.push({
      label: metadata?.title?.toLowerCase() || segment,
      href: nextPath
    });
    
    return nextPath;
  }, '');
  
  return breadcrumbs;
}