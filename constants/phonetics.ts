/**
 * ARPABET (CMU Pronouncing Dictionary phoneme set) to IPA mapping.
 * Keys are base ARPABET symbols with stress digits removed. Used to render a
 * readable IPA pronunciation from CMU transcriptions at build time.
 */
export const ARPABET_TO_IPA: Record<string, string> = {
  // Vowels
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ',
  EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', IH: 'ɪ', IY: 'i',
  OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
  // Consonants
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h',
  JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p',
  R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w',
  Y: 'j', Z: 'z', ZH: 'ʒ',
};

/** IPA stress marks placed before the stressed syllable's vowel. */
export const IPA_PRIMARY_STRESS = 'ˈ';
export const IPA_SECONDARY_STRESS = 'ˌ';
