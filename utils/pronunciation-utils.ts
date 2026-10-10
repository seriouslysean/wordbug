import { dictionary } from 'cmu-pronouncing-dictionary';

import { ARPABET_TO_IPA, IPA_PRIMARY_STRESS, IPA_SECONDARY_STRESS } from '#constants/phonetics';
import type { PronunciationResult } from '#types';
import { countSyllables } from '#utils/text-utils';

/** ARPABET vowel phonemes carry a trailing stress digit (0, 1, or 2). */
const STRESS_DIGIT = /[0-2]$/;

/** IPA stress mark for an ARPABET stress digit (primary, secondary, or none). */
const stressMark = (stress: string): string => {
  if (stress === '1') {
    return IPA_PRIMARY_STRESS;
  }
  if (stress === '2') {
    return IPA_SECONDARY_STRESS;
  }
  return '';
};

/**
 * Maps a base ARPABET vowel to IPA, using reduced forms for unstressed
 * mid-central vowels (ARPABET stress 0) which are otherwise rendered too strong.
 */
const vowelToIpa = (base: string, stress: string): string => {
  if (stress === '0' && base === 'AH') {
    return 'ə';
  }
  if (stress === '0' && base === 'ER') {
    return 'ɚ';
  }
  return ARPABET_TO_IPA[base] ?? '';
};

/**
 * Looks up the primary CMU pronunciation for a word and derives an IPA
 * rendering (with stress marks), a per-syllable stress pattern, and a syllable
 * count. Returns null when the word is not in the dictionary so callers can fall
 * back or self-hide. Only the bare key (primary pronunciation) is used, ignoring
 * CMU's `word(2)` alternates, to stay deterministic.
 */
export const getPronunciation = (word: string): PronunciationResult | null => {
  if (!word) {
    return null;
  }

  const arpabet = dictionary[word.toLowerCase()];
  if (!arpabet) {
    return null;
  }

  const stressDigits: string[] = [];
  let ipa = '';

  for (const phoneme of arpabet.split(' ')) {
    if (STRESS_DIGIT.test(phoneme)) {
      const stress = phoneme.slice(-1);
      const base = phoneme.slice(0, -1);
      stressDigits.push(stress);
      ipa += stressMark(stress) + vowelToIpa(base, stress);
    } else {
      ipa += ARPABET_TO_IPA[phoneme] ?? '';
    }
  }

  return {
    arpabet,
    ipa,
    stress: stressDigits.join('-'),
    syllableCount: stressDigits.length,
  };
};

/**
 * Authoritative syllable count from CMU, falling back to the heuristic
 * countSyllables for words not in the dictionary.
 */
export const getSyllableCount = (word: string): number => {
  const pronunciation = getPronunciation(word);
  return pronunciation ? pronunciation.syllableCount : countSyllables(word);
};
