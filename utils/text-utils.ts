/**
 * Format word count with proper singular/plural
 * @param count - Number of words
 * @returns Formatted string like "1 word" or "5 words"
 */
export const formatWordCount = (count: number): string => {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
};