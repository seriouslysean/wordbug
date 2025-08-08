/**
 * Format word count with proper singular/plural
 * @param count - Number of words
 * @returns Formatted string like "1 word" or "5 words"
 */
export const formatWordCount = (count: number): string => {
  return `${count} ${count === 1 ? 'word' : 'words'}`;
};

/**
 * Check if a word starts and ends with the same letter
 * @param word - Word to evaluate
 * @returns True if first and last letters match and length > 1
 */
export const isStartEndSame = (word: string): boolean => {
  return word.length > 1 && word[0].toLowerCase() === word[word.length - 1].toLowerCase();
};

/**
 * Check if word contains consecutive identical letters
 * @param word - Word to inspect
 * @returns True if word has repeated consecutive letters
 */
export const hasDoubleLetters = (word: string): boolean => {
  return /(.)\1/.test(word);
};

/**
 * Check if word contains triple or more consecutive letters
 * @param word - Word to inspect  
 * @returns True if word has 3+ repeated letters in a row
 */
export const hasTripleLetters = (word: string): boolean => {
  return /(.)\1{2,}/.test(word);
};

/**
 * Check for consecutive alphabetical letter sequences (abc, def, etc.)
 * @param word - Word to analyze
 * @returns True if contains 3+ consecutive alphabetical letters
 */
export const hasAlphabeticalSequence = (word: string): boolean => {
  const letters = word.toLowerCase();
  return Array.from(letters)
    .slice(0, -2)
    .some((_, i) => {
      const [a, b, c] = [letters.charCodeAt(i), letters.charCodeAt(i + 1), letters.charCodeAt(i + 2)];
      return b === a + 1 && c === b + 1;
    });
};

/**
 * Get common word endings matched by word
 * @param word - Word to examine
 * @returns Array of matched endings
 */
export const getWordEndings = (word: string): string[] => {
  const endings = ['ing', 'ed', 'ly', 'ness', 'ful', 'less'];
  return endings.filter(ending => word.endsWith(ending));
};

/**
 * Check if word consists only of vowels
 * @param word - Word to check
 * @returns True if word contains only vowels
 */
export const isAllVowels = (word: string): boolean => {
  return word.length > 0 && /^[aeiou]+$/i.test(word);
};

/**
 * Check if word consists only of consonants
 * @param word - Word to check  
 * @returns True if word contains only consonants
 */
export const isAllConsonants = (word: string): boolean => {
  return word.length > 0 && /^[^aeiou]+$/i.test(word);
};

/**
 * Count vowels in word
 * @param word - Word to analyze
 * @returns Number of vowels found (case-insensitive)
 */
export const getVowelCount = (word: string): number => {
  return word ? (word.match(/[aeiou]/gi) || []).length : 0;
};

/**
 * Count consonants in word
 * @param word - Word to analyze
 * @returns Number of consonants found (case-insensitive)
 */
export const getConsonantCount = (word: string): number => {
  return word ? (word.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length : 0;
};

/**
 * Check if word reads the same forwards and backwards
 * @param word - Word to check
 * @returns True if word is a palindrome (case-insensitive)
 */
export const isPalindrome = (word: string): boolean => {
  if (!word) return false;
  const normalized = word.toLowerCase();
  return normalized === normalized.split('').reverse().join('');
};

/**
 * Count syllables in English word using modern heuristic algorithm
 * Based on vowel groups with linguistic rule adjustments
 * @param word - Word to analyze
 * @returns Estimated syllable count (minimum 1 for non-empty words)
 */
export const countSyllables = (word: string): number => {
  if (!word) return 0;
  
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  
  // Single letter = 1 syllable
  if (clean.length === 1) return 1;
  
  // Count vowel groups - consecutive vowels = 1 syllable
  const vowelGroups = clean.match(/[aeiouy]+/g) || [];
  const baseCount = vowelGroups.length;
  
  // Apply linguistic adjustments using functional composition
  const adjustments = [
    // Subtract silent 'e' at end (but not if only vowel)
    (count: number) => clean.endsWith('e') && count > 1 ? count - 1 : count,
    // Subtract silent 'ed' endings (except after d/t)
    (count: number) => clean.endsWith('ed') && count > 1 && !clean.match(/[dt]ed$/) ? count - 1 : count,
    // Add syllable for 'le' endings after consonant
    (count: number) => clean.match(/[^aeiou]le$/) ? count + 1 : count,
    // Ensure minimum 1 syllable for any word
    (count: number) => Math.max(1, count)
  ];
  
  return adjustments.reduce((count, adjust) => adjust(count), baseCount);
};