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
 * Translate pluralize - handles count-based pluralization with additional interpolation values
 * @param baseKey - The base translation key (e.g., 'common.words')
 * @param count - The count to determine plural form
 * @param additionalValues - Additional interpolation values to pass to t()
 * @returns Translated string with proper pluralization
 */
export const tp = (
  baseKey: string, 
  count: number | string, 
  additionalValues: Record<string, any> = {}
): string => {
  if (count == null) {
    throw new Error(`Count is required for pluralization key: ${baseKey}`);
  }
  const numCount = parseInt(String(count));
  if (Number.isNaN(numCount)) {
    throw new Error(`Invalid count for pluralization key: ${baseKey}, got: ${count}`);
  }
  
  let suffix: string;
  if (numCount === 0) {
    suffix = 'zero';
  } else if (numCount === 1) {
    suffix = 'one';
  } else {
    suffix = 'other';
  }
  
  return t(`${baseKey}_${suffix}`, { count: numCount, ...additionalValues });
};