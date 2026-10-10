// CSS hex notation: #rgb, #rgba, #rrggbb or #rrggbbaa.
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

export const isHexColor = (value: string): boolean => HEX_COLOR.test(value.trim());

/**
 * Resolve a color setting to a CSS hex color. Unset, empty or blank means the
 * default; surrounding whitespace is ignored, as CSS ignores it. Anything
 * else that is not a hex color throws, naming the setting, because the value
 * is pasted into markup where a malformed one renders as black. The result is
 * lowercase, as case does not change the color: #9A3412 and #9a3412 must
 * give the same image settings fingerprint, or one re-renders every card.
 * @param name - Setting name, such as `COLOR_PRIMARY`
 * @param value - Raw setting value
 * @param fallback - Default hex color
 * @returns The hex color to use, in lowercase
 */
export const resolveHexColor = (name: string, value: string | undefined, fallback: string): string => {
  const color = value?.trim() || fallback;
  if (!isHexColor(color)) {
    throw new Error(`${name} must be a hex color such as #9a3412, got ${JSON.stringify(value)}`);
  }
  return color.toLowerCase();
};
