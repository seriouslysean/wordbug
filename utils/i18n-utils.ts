import translations from '../locales/en.json';

export const defaultLang = 'en';

/**
 * Simple translation function for basic key lookups
 * @param key - Translation key (e.g., 'nav.home')
 * @param vars - Variables for interpolation
 * @returns Translated string with interpolated variables
 */
export const t = (key: string, vars?: Record<string, string | number>): string => {
  // Navigate to nested key (e.g., 'nav.home')
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value !== 'string') {
    throw new Error(`Translation missing for key: ${key}`);
  }
  
  // Interpolate variables if provided
  if (vars) {
    // First check if all required variables are provided
    const requiredVars = [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]);
    for (const varName of requiredVars) {
      if (!(varName in vars)) {
        throw new Error(`Missing required variable '${varName}' for translation key: ${key}`);
      }
      if (vars[varName] == null) {
        throw new Error(`Variable '${varName}' is undefined or null for translation key: ${key}`);
      }
    }
    
    return value.replace(/\{\{(\w+)\}\}/g, (_, p1) => {
      return String(vars[p1]);
    });
  }
  
  // If the translation has variables but none were provided, throw an error
  if (value.includes('{{')) {
    throw new Error(`Translation key '${key}' requires variables but none were provided`);
  }
  
  return value;
};

/**
 * Format word count with proper singular/plural using i18n
 * @param count - Number of words
 * @returns Formatted string like "1 word" or "5 words"
 */
export const formatWordCount = (count: number): string => {
  if (count === 0) {
    return t('common.words_zero');
  } else if (count === 1) {
    return t('common.words_one');
  } else {
    return t('common.words_other', { count });
  }
};