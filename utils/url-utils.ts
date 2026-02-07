import { ROUTES } from '#constants/urls';

/**
 * Get URL for words of a specific length
 * @param length - Word length (number or string)
 * @returns URL path for length-filtered words
 */
export const getLengthUrl = (length: number | string): string => {
  return ROUTES.LENGTH(Number(length));
};

/**
 * Get URL for words starting with a specific letter
 * @param letter - Starting letter
 * @returns URL path for letter-filtered words
 */
export const getLetterUrl = (letter: string): string => {
  return ROUTES.LETTER(letter);
};

/**
 * Get URL for words with a specific part of speech
 * @param partOfSpeech - Part of speech
 * @returns URL path for part-of-speech-filtered words
 */
export const getPartOfSpeechUrl = (partOfSpeech: string): string => {
  return ROUTES.PART_OF_SPEECH(partOfSpeech);
};
