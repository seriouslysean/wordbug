import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

export const collections = {
  words: defineCollection({
    loader: glob({
      pattern: '**/*.json',
      base: __WORD_DATA_PATH__,
    }),
  }),
};