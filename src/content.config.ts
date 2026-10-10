import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { isValidDate } from '#utils/date-utils';

import type { BasePartOfSpeech } from '#constants/parts-of-speech';
import { isBasePartOfSpeech } from '#constants/parts-of-speech';
import { areValidReferences } from '#utils/reference-utils';
import { isHttpUrl } from '#utils/type-guards';

const nonblankString = z.string().refine(value => value.trim().length > 0, 'Must not be blank');
const nonemptyStrings = z.array(nonblankString).min(1);
const referenceSchema = z.object({
    start: z.number().int(),
    end: z.number().int(),
    url: nonblankString.refine(isHttpUrl, 'Must be an absolute HTTP(S) URL'),
}).strict();
const definitionFields = z.object({
  id: nonblankString.optional(),
  text: nonblankString,
  references: z.array(referenceSchema).min(1).optional(),
  attributionText: nonblankString.optional(),
  sourceDictionary: nonblankString.optional(),
  sourceUrl: nonblankString.refine(isHttpUrl, 'Must be an absolute HTTP(S) URL').optional(),
  examples: nonemptyStrings.optional(),
  synonyms: nonemptyStrings.optional(),
  antonyms: nonemptyStrings.optional(),
}).strict();
const dictionaryDefinitionSchema = z.union([
  definitionFields.extend({
    partOfSpeech: z.custom<BasePartOfSpeech>(
      (value): value is BasePartOfSpeech => typeof value === 'string' && isBasePartOfSpeech(value),
    ),
    label: z.never().optional(),
  }),
  definitionFields.extend({
    partOfSpeech: z.never().optional(),
    label: nonblankString.optional(),
  }),
]).refine(
  definition => definition.references === undefined || areValidReferences(definition.text, definition.references),
  'References must be ordered, non-overlapping, in bounds, nonblank, and use HTTP(S)',
);

export const collections = {
  words: defineCollection({
    loader: glob({
      pattern: '**/*.json',
      base: __WORD_DATA_PATH__,
    }),
    schema: z.object({
      word: z.string().refine(word => word.trim().length > 0, 'Word must not be empty'),
      date: z.string().refine(isValidDate, 'Date must be a valid YYYYMMDD date'),
      adapter: z.string(),
      preserveCase: z.boolean().default(false),
      data: z.array(dictionaryDefinitionSchema).min(1),
      rawData: z.unknown().optional(),
      // Optional word-level enrichment must be declared explicitly so strict
      // stored-data validation accepts it and passes it through to rendering.
      enrichment: z
        .object({
          synonyms: z.array(z.string()).optional(),
          antonyms: z.array(z.string()).optional(),
          related: z.array(z.string()).optional(),
          pronunciation: z.string().optional(),
          audio: z.string().optional(),
          etymology: z.string().optional(),
        })
        .strict()
        .optional(),
    }).strict(),
  }),
};
