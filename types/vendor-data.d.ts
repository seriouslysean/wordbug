/**
 * Ambient declarations for the offline linguistic datasets. Hand-written types
 * keep `astro check` from inferring a multi-thousand-element tuple from the raw
 * data files (which would blow up the type checker), and give the untyped CMU
 * package a clean shape.
 */

declare module 'subtlex-word-frequencies' {
  const data: ReadonlyArray<{ word: string; count: number }>;
  export default data;
}

declare module 'cmu-pronouncing-dictionary' {
  export const dictionary: Readonly<Record<string, string>>;
}
