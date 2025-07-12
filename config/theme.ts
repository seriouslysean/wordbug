/**
 * Theme configuration for occasional-wotd
 *
 * This file centralizes theme colors that are used across different parts
 * of the application, including CSS variables and image generation.
 *
 * Override colors using environment variables:
 * - COLOR_PRIMARY
 * - COLOR_PRIMARY_DARK
 * - COLOR_PRIMARY_LIGHT
 */

import type { ThemeColors,ThemeConfig } from '~types/config';

export const theme: ThemeConfig = {
  colors: {
    // Primary brand colors - can be overridden with environment variables
    primary: process.env.COLOR_PRIMARY || '#6b8e6b',
    primaryLight: process.env.COLOR_PRIMARY_LIGHT || '#7a9f7a',
    primaryDark: process.env.COLOR_PRIMARY_DARK || '#4a6a4a',

    // Background colors
    background: '#fff',
    backgroundLight: '#f8f9fa',

    // Text colors
    text: '#333',
    textLight: '#666',
    textLighter: '#8a8f98',
  } as ThemeColors,

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Font sizes
  fontSize: {
    xs: '0.75rem',
    small: 'clamp(0.875rem, 2vw, 1rem)',
    base: 'clamp(1rem, 2.5vw, 1.125rem)',
    huge: 'clamp(3rem, 15vw, 8rem)',
  },

  // Spacing
  spacing: {
    small: '0.5rem',
    base: '1rem',
    large: '2rem',
  },

  // Content widths
  contentWidth: {
    small: 'min(600px, 90vw)',
    medium: 'min(800px, 90vw)',
    large: 'min(1200px, 90vw)',
    full: '95vw',
  },

  // Other design tokens
  other: {
    borderRadius: '8px',
    shadowColor: '186deg 47% 28%',
  },

  // Image generation specific colors
  // These are used in SVG gradients for social share images
  imageGradient: {
    light: process.env.COLOR_PRIMARY_LIGHT || '#7a9f7a',
    default: process.env.COLOR_PRIMARY || '#6b8e6b',
    dark: process.env.COLOR_PRIMARY_DARK || '#4a6a4a',
  },
};

/**
 * Convert camelCase to kebab-case
 * @param {string} str - camelCase string
 * @returns {string} kebab-case string
 */
const toKebabCase = (str: string): string => str.replace(/([A-Z])/g, '-$1').toLowerCase();

/**
 * Generate CSS variables from theme section
 * @param {Object} section - Theme section object
 * @param {string} prefix - CSS variable prefix
 * @returns {string[]} Array of CSS variable declarations
 */
const generateSection = (section: Record<string, string | number>, prefix: string): string[] =>
  Object.entries(section).map(([key, value]) =>
    `--${prefix}-${toKebabCase(key)}: ${value};`,
  );

/**
 * Generate CSS variables from theme configuration
 * @returns {string} CSS variable declarations
 */
export function generateCSSVariables(): string {
  const cssVars = [
    ...generateSection(theme.colors, 'color'),
    ...generateSection(theme.fontWeight, 'font-weight'),
    ...generateSection(theme.fontSize, 'font-size'),
    ...generateSection(theme.spacing, 'spacing'),
    ...generateSection(theme.contentWidth, 'content-width'),
    ...Object.entries(theme.other).map(([key, value]) =>
      `--${toKebabCase(key)}: ${value};`,
    ),
  ];

  return cssVars.join('\n    ');
}

export default theme;
