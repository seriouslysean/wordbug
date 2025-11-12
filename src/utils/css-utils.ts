/**
 * CSS utility functions for dynamic class construction
 * Consolidates class building logic from components like SiteButton and SiteLink
 */

/**
 * Build button CSS classes based on variant
 * Used by SiteButton and SiteLink components
 *
 * @param variant - Button style variant
 * @param additionalClasses - Optional additional CSS classes
 * @returns Combined class string
 */
export const buildButtonClasses = (
  variant: 'text' | 'primary' | 'secondary',
  additionalClasses?: string
): string => {
  if (variant === 'text' && additionalClasses) {
    return additionalClasses;
  }

  return ['site-button', `site-button--${variant}`, additionalClasses]
    .filter(Boolean)
    .join(' ');
};

/**
 * Conditionally join CSS classes, filtering out falsy values
 *
 * @param classes - Array of class strings (can include undefined, null, false)
 * @returns Combined class string with only truthy values
 */
export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Build grid column classes
 *
 * @param columns - Number of columns
 * @returns Grid class string
 */
export const buildGridClasses = (columns: number): string => {
  return `grid grid-cols-${columns}`;
};
