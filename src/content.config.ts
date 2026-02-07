import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { normalizePartOfSpeech } from '#utils/word-data-utils';

export const collections = {
  words: defineCollection({
    loader: glob({
      pattern: '**/*.json',
      base: __WORD_DATA_PATH__,
    }),
    schema: z.object({
      word: z.string(),
      date: z.string(),
      adapter: z.string(),
      preserveCase: z.boolean().default(false),
      data: z.array(z.any()).transform((definitions) =>
        definitions.map(def => ({
          ...def,
          partOfSpeech: def.partOfSpeech ? normalizePartOfSpeech(def.partOfSpeech) : def.partOfSpeech,
        }))
      ),
    }),
  }),
};