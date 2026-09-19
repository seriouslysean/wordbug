/**
 * Primitive type guards for narrowing `unknown` values at data boundaries
 * (API responses, parsed JSON). Shape-specific guards build on these.
 */

/**
 * True for plain key/value objects. Arrays and null are excluded so property
 * reads on the narrowed value are always safe.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * True for a string with at least one non-whitespace character.
 */
export const isNonblankString = (value: unknown): value is string => isString(value) && value.trim().length > 0;

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

/**
 * True for an absolute http or https URL.
 */
export const isHttpUrl = (value: unknown): value is string => {
  if (!isString(value) || !URL.canParse(value)) {
    return false;
  }
  const { protocol } = new URL(value);
  return protocol === 'https:' || protocol === 'http:';
};

/**
 * True when the value is absent or satisfies the guard. JSON has no
 * `undefined`, so an optional field is either missing or must be well-formed.
 */
export const isOptional = <T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T | undefined =>
  value === undefined || guard(value);
