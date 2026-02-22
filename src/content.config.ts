import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { normalizePartOfSpeech } from '#utils/word-data-utils';

const dictionaryDefinitionSchema = z.object({
  id: z.string().optional(),
  partOfSpeech: z.string().optional(),
  text: z.union([z.string(), z.array(z.string())]).optional(),
  attributionText: z.string().optional(),
  sourceDictionary: z.string().optional(),
  sourceUrl: z.string().optional(),
  examples: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
}).passthrough();

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
      data: z.array(dictionaryDefinitionSchema).transform((definitions) =>
        definitions.map(def => ({
          ...def,
          partOfSpeech: def.partOfSpeech ? normalizePartOfSpeech(def.partOfSpeech) : def.partOfSpeech,
        }))
      ),
    }),
  }),
};