/**
 * Environment validation utilities
 */

/**
 * Validates required environment variables
 */
export const validateEnvironment = (requiredVars: string[]): void => {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Validate required environment variables for the application
 */
export const validateAppEnvironment = (): void => {
  const requiredVars = [
    'SITE_NAME',
    'SITE_TITLE',
    'SITE_DESCRIPTION',
    'SITE_URL',
    'SITE_AUTHOR',
    'SITE_ID',
  ];

  validateEnvironment(requiredVars);
};

/**
 * Validate required environment variables for API operations
 */
export const validateApiEnvironment = (): void => {
  validateEnvironment(['WORDNIK_API_KEY']);
};